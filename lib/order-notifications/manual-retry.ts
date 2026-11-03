import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orderNotificationOutbox } from "@/db/schema";
import { isUuid } from "@/lib/catalog/model";
import { OrderNotificationError } from "@/lib/order-notifications/errors";
import { getOrderActor } from "@/lib/orders/actor-repository";

export async function retryOrderNotification(input: {
  actorId: string;
  orderId: string;
  notificationId: string;
  expectedVersion: number;
}) {
  if (
    !isUuid(input.notificationId) ||
    !isUuid(input.orderId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 1
  ) {
    throw new OrderNotificationError("INVALID_INPUT");
  }
  return db.transaction(async (transaction) => {
    await getOrderActor(transaction, input.actorId, "order:manage", true);
    const [notification] = await transaction
      .select()
      .from(orderNotificationOutbox)
      .where(eq(orderNotificationOutbox.id, input.notificationId))
      .limit(1)
      .for("update");
    if (!notification) throw new OrderNotificationError("NOT_FOUND");
    if (notification.orderId !== input.orderId) {
      throw new OrderNotificationError("NOT_FOUND");
    }
    if (notification.mutationVersion !== input.expectedVersion) {
      throw new OrderNotificationError("STALE");
    }
    if (
      notification.status !== "failed" ||
      notification.failureDisposition !== "retry_exhausted"
    ) {
      throw new OrderNotificationError("NOT_RETRYABLE");
    }
    const now = new Date();
    const mutationVersion = notification.mutationVersion + 1;
    await transaction
      .update(orderNotificationOutbox)
      .set({
        status: "pending",
        cycleAttemptCount: 0,
        manualRetryCount: notification.manualRetryCount + 1,
        nextAttemptAt: now,
        claimToken: null,
        claimedAt: null,
        lastErrorCode: null,
        failureDisposition: null,
        failedAt: null,
        mutationVersion,
        updatedAt: now,
      })
      .where(eq(orderNotificationOutbox.id, notification.id));
    return {
      id: notification.id,
      orderId: notification.orderId,
      mutationVersion,
    };
  });
}
