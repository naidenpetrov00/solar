import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  user,
  userNotification,
  webPushDelivery,
  webPushSubscription,
} from "@/db/schema";
import { authorizedPushNotificationIdentities } from "@/lib/in-app-notifications/registry";
import { getWebPushEnvironment } from "@/lib/web-push/config";
import {
  webPushBatchSize,
  webPushLeaseMilliseconds,
  webPushRetryDelaysMilliseconds,
} from "@/lib/web-push/model";
import { composeWebPushPayload } from "@/lib/web-push/presentation";
import { sendWebPush } from "@/lib/web-push/transport";

type ClaimedDelivery = typeof webPushDelivery.$inferSelect;
type ErrorCode = NonNullable<ClaimedDelivery["lastErrorCode"]>;

async function claimDeliveries() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - webPushLeaseMilliseconds);
  return db.transaction(async (transaction) => {
    const candidates = await transaction
      .select({ id: webPushDelivery.id })
      .from(webPushDelivery)
      .where(or(
        and(eq(webPushDelivery.status, "pending"), lte(webPushDelivery.nextAttemptAt, now)),
        and(eq(webPushDelivery.status, "processing"), lte(webPushDelivery.claimedAt, staleBefore)),
      ))
      .orderBy(asc(webPushDelivery.nextAttemptAt), asc(webPushDelivery.createdAt))
      .limit(webPushBatchSize)
      .for("update", { skipLocked: true });
    const claimed: ClaimedDelivery[] = [];
    for (const candidate of candidates) {
      const [row] = await transaction
        .update(webPushDelivery)
        .set({
          status: "processing",
          attemptCount: sql`${webPushDelivery.attemptCount} + 1`,
          nextAttemptAt: null,
          claimToken: randomUUID(),
          claimedAt: now,
          lastAttemptAt: now,
          updatedAt: now,
        })
        .where(eq(webPushDelivery.id, candidate.id))
        .returning();
      if (row) claimed.push(row);
    }
    return claimed;
  });
}

async function finalize(
  delivery: ClaimedDelivery,
  result:
    | { status: "sent" }
    | { status: "cancelled" | "failed"; code: ErrorCode; retryable?: boolean },
) {
  const now = new Date();
  const exhausted = delivery.attemptCount >= 6;
  const retry = result.status !== "sent" && result.retryable && !exhausted;
  const delay = webPushRetryDelaysMilliseconds[
    Math.min(delivery.attemptCount - 1, webPushRetryDelaysMilliseconds.length - 1)
  ] ?? 12 * 60 * 60_000;
  await db
    .update(webPushDelivery)
    .set(result.status === "sent" ? {
      status: "sent", sentAt: now, nextAttemptAt: null,
      claimToken: null, claimedAt: null, updatedAt: now,
    } : retry ? {
      status: "pending", nextAttemptAt: new Date(now.getTime() + delay),
      claimToken: null, claimedAt: null, updatedAt: now,
    } : {
      status: result.status,
      nextAttemptAt: null,
      claimToken: null,
      claimedAt: null,
      lastErrorCode: result.code,
      failureDisposition: result.status === "cancelled"
        ? "cancelled"
        : result.retryable ? "retry_exhausted" : "permanent",
      failedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(webPushDelivery.id, delivery.id),
      eq(webPushDelivery.status, "processing"),
      eq(webPushDelivery.claimToken, delivery.claimToken!),
    ));
}

async function deliver(delivery: ClaimedDelivery) {
  const [context] = await db
    .select({
      notificationId: userNotification.id,
      notificationRecipientUserId: userNotification.recipientUserId,
      notificationKind: userNotification.kind,
      notificationPayloadVersion: userNotification.payloadVersion,
      notificationPayload: userNotification.payload,
      notificationCreatedAt: userNotification.createdAt,
      notificationReadAt: userNotification.readAt,
      subscriptionId: webPushSubscription.id,
      subscriptionRecipientUserId: webPushSubscription.recipientUserId,
      endpoint: webPushSubscription.endpoint,
      p256dh: webPushSubscription.p256dh,
      auth: webPushSubscription.auth,
      locale: webPushSubscription.locale,
      vapidKeyFingerprint: webPushSubscription.vapidKeyFingerprint,
      subscriptionStatus: webPushSubscription.status,
      userRole: user.role,
      userBanned: user.banned,
      banExpires: user.banExpires,
    })
    .from(webPushDelivery)
    .innerJoin(userNotification, eq(webPushDelivery.notificationId, userNotification.id))
    .innerJoin(webPushSubscription, eq(webPushDelivery.subscriptionId, webPushSubscription.id))
    .innerJoin(user, eq(webPushSubscription.recipientUserId, user.id))
    .where(eq(webPushDelivery.id, delivery.id))
    .limit(1);
  if (!context || context.notificationRecipientUserId !== context.subscriptionRecipientUserId) {
    await finalize(delivery, { status: "cancelled", code: "OWNERSHIP_MISMATCH" });
    return;
  }
  const banned = context.userBanned === true &&
    (!context.banExpires || context.banExpires.getTime() > Date.now());
  if (
    banned || context.subscriptionStatus !== "active" ||
    !authorizedPushNotificationIdentities(context.userRole).some(
      ({ kind, payloadVersion }) =>
        kind === context.notificationKind && payloadVersion === context.notificationPayloadVersion,
    )
  ) {
    await finalize(delivery, { status: "cancelled", code: "ACCESS_REVOKED" });
    return;
  }
  let environment: ReturnType<typeof getWebPushEnvironment>;
  try { environment = getWebPushEnvironment(); }
  catch {
    await finalize(delivery, { status: "failed", code: "PROVIDER_FAILURE", retryable: true });
    return;
  }
  if (!environment) {
    await finalize(delivery, { status: "failed", code: "PROVIDER_FAILURE", retryable: true });
    return;
  }
  if (context.vapidKeyFingerprint !== environment.keyFingerprint) {
    await db.update(webPushSubscription).set({ status: "expired", expiredAt: new Date() })
      .where(eq(webPushSubscription.id, context.subscriptionId));
    await finalize(delivery, { status: "cancelled", code: "VAPID_KEY_STALE" });
    return;
  }
  let message: Awaited<ReturnType<typeof composeWebPushPayload>>;
  try {
    message = await composeWebPushPayload(
      {
        id: context.notificationId,
        kind: context.notificationKind,
        payloadVersion: context.notificationPayloadVersion,
        payload: context.notificationPayload,
        createdAt: context.notificationCreatedAt,
        readAt: context.notificationReadAt,
      },
      context.userRole,
      context.locale,
    );
  } catch {
    await finalize(delivery, { status: "failed", code: "PAYLOAD_INVALID" });
    return;
  }
  const result = await sendWebPush({
    endpoint: context.endpoint,
    p256dh: context.p256dh,
    auth: context.auth,
    ...message,
  });
  if (result.status === "sent") {
    await db.update(webPushSubscription).set({ lastDeliveredAt: new Date() })
      .where(eq(webPushSubscription.id, context.subscriptionId));
    await finalize(delivery, { status: "sent" });
  } else if (result.status === "gone") {
    await db.update(webPushSubscription).set({ status: "expired", expiredAt: new Date() })
      .where(eq(webPushSubscription.id, context.subscriptionId));
    await finalize(delivery, { status: "failed", code: "SUBSCRIPTION_GONE" });
  } else {
    await finalize(delivery, { status: "failed", code: "PROVIDER_FAILURE", retryable: true });
  }
}

export async function dispatchWebPushNotifications() {
  const claimed = await claimDeliveries();
  for (let index = 0; index < claimed.length; index += 3) {
    const results = await Promise.allSettled(claimed.slice(index, index + 3).map(deliver));
    if (results.some((result) => result.status === "rejected")) {
      throw new Error("WEB_PUSH_BATCH_FINALIZE_FAILED");
    }
  }
  return { processed: claimed.length };
}

export async function kickWebPushDispatcher() {
  try { await dispatchWebPushNotifications(); }
  catch { console.error({ event: "web_push_dispatch_kick_failed" }); }
}
