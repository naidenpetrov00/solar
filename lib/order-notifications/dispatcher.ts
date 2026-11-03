import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderNotificationOutbox } from "@/db/schema";
import { createEmailTransport } from "@/lib/email/transport";
import type { EmailMessage, EmailTransport } from "@/lib/email/delivery";
import {
  composeOrderNotification,
  NotificationCompositionError,
} from "@/lib/order-notifications/composition";
import {
  orderNotificationBatchSize,
  orderNotificationLeaseMilliseconds,
  orderNotificationMaximumBatchSize,
  orderNotificationRetryDelaysMilliseconds,
  type OrderNotificationErrorCode,
  type OrderNotificationFailureDisposition,
} from "@/lib/order-notifications/model";

type ClaimedNotification = typeof orderNotificationOutbox.$inferSelect;

function boundedBatchSize(value?: number) {
  if (!Number.isSafeInteger(value) || !value || value < 1) {
    return orderNotificationBatchSize;
  }
  return Math.min(value, orderNotificationMaximumBatchSize);
}

async function claimNotifications(limit: number) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - orderNotificationLeaseMilliseconds);
  return db.transaction(async (transaction) => {
    const candidates = await transaction
      .select({ id: orderNotificationOutbox.id })
      .from(orderNotificationOutbox)
      .where(
        or(
          and(
            eq(orderNotificationOutbox.status, "pending"),
            lte(orderNotificationOutbox.nextAttemptAt, now),
          ),
          and(
            eq(orderNotificationOutbox.status, "processing"),
            lte(orderNotificationOutbox.claimedAt, staleBefore),
          ),
        ),
      )
      .orderBy(
        asc(orderNotificationOutbox.nextAttemptAt),
        asc(orderNotificationOutbox.createdAt),
      )
      .limit(limit)
      .for("update", { skipLocked: true });
    const claimed: ClaimedNotification[] = [];
    for (const candidate of candidates) {
      const claimToken = randomUUID();
      const [row] = await transaction
        .update(orderNotificationOutbox)
        .set({
          status: "processing",
          attemptCount: sql`${orderNotificationOutbox.attemptCount} + 1`,
          cycleAttemptCount: sql`${orderNotificationOutbox.cycleAttemptCount} + 1`,
          nextAttemptAt: null,
          claimToken,
          claimedAt: now,
          lastAttemptAt: now,
          mutationVersion: sql`${orderNotificationOutbox.mutationVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(orderNotificationOutbox.id, candidate.id))
        .returning();
      if (!row) throw new Error("ORDER_NOTIFICATION_CLAIM_FAILED");
      claimed.push(row);
    }
    return claimed;
  });
}

async function finalizeSent(notification: ClaimedNotification) {
  const now = new Date();
  const rows = await db
    .update(orderNotificationOutbox)
    .set({
      status: "sent",
      claimToken: null,
      claimedAt: null,
      lastErrorCode: null,
      failureDisposition: null,
      sentAt: now,
      failedAt: null,
      mutationVersion: sql`${orderNotificationOutbox.mutationVersion} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(orderNotificationOutbox.id, notification.id),
        eq(orderNotificationOutbox.status, "processing"),
        eq(orderNotificationOutbox.claimToken, notification.claimToken!),
      ),
    )
    .returning({ id: orderNotificationOutbox.id });
  if (rows.length !== 1) throw new Error("ORDER_NOTIFICATION_FINALIZE_FAILED");
}

async function finalizeFailure(
  notification: ClaimedNotification,
  failure: {
    code: OrderNotificationErrorCode;
    retryable: boolean;
  },
) {
  const now = new Date();
  const exhausted = notification.cycleAttemptCount >= 6;
  const terminal = !failure.retryable || exhausted;
  const disposition: OrderNotificationFailureDisposition | null = terminal
    ? failure.retryable
      ? "retry_exhausted"
      : "permanent"
    : null;
  const delay = terminal
    ? null
    : orderNotificationRetryDelaysMilliseconds[
        Math.min(
          notification.cycleAttemptCount - 1,
          orderNotificationRetryDelaysMilliseconds.length - 1,
        )
      ] ?? 12 * 60 * 60_000;
  const rows = await db
    .update(orderNotificationOutbox)
    .set({
      status: terminal ? "failed" : "pending",
      nextAttemptAt: delay === null ? null : new Date(now.getTime() + delay),
      claimToken: null,
      claimedAt: null,
      lastErrorCode: terminal ? failure.code : null,
      failureDisposition: disposition,
      failedAt: terminal ? now : null,
      mutationVersion: sql`${orderNotificationOutbox.mutationVersion} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(orderNotificationOutbox.id, notification.id),
        eq(orderNotificationOutbox.status, "processing"),
        eq(orderNotificationOutbox.claimToken, notification.claimToken!),
      ),
    )
    .returning({ id: orderNotificationOutbox.id });
  if (rows.length !== 1) throw new Error("ORDER_NOTIFICATION_FINALIZE_FAILED");
}

async function deliverNotification(
  notification: ClaimedNotification,
  transport: EmailTransport,
) {
  let message: EmailMessage;
  try {
    message = await composeOrderNotification(notification);
  } catch (error) {
    const failure =
      error instanceof NotificationCompositionError
        ? { code: error.code, retryable: error.retryable }
        : { code: "COMPOSITION_FAILED" as const, retryable: true };
    await finalizeFailure(notification, failure);
    return;
  }
  const delivery = await transport.send(message);
  if (delivery.status === "sent") {
    await finalizeSent(notification);
    return;
  }
  await finalizeFailure(notification, {
    code: delivery.errorCode,
    retryable: delivery.retryable,
  });
}

export async function dispatchOrderNotifications(options?: {
  batchSize?: number;
}) {
  const transport = createEmailTransport();
  const claimed = await claimNotifications(boundedBatchSize(options?.batchSize));
  for (let index = 0; index < claimed.length; index += 3) {
    const results = await Promise.allSettled(
      claimed
        .slice(index, index + 3)
        .map((notification) => deliverNotification(notification, transport)),
    );
    if (results.some((result) => result.status === "rejected")) {
      throw new Error("ORDER_NOTIFICATION_BATCH_FINALIZE_FAILED");
    }
  }
  return { processed: claimed.length };
}

export async function kickOrderNotificationDispatcher() {
  try {
    await dispatchOrderNotifications();
  } catch {
    console.error({ event: "order_notification_dispatch_kick_failed" });
  }
}
