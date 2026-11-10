import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { webPushDelivery, webPushSubscription } from "@/db/schema";
import type { OrderTransaction } from "@/lib/orders/repository-types";

export async function enqueueWebPushDeliveries(
  transaction: OrderTransaction,
  notifications: Array<{ id: string; recipientUserId: string }>,
) {
  if (!notifications.length) return;
  const recipientIds = [...new Set(notifications.map(({ recipientUserId }) => recipientUserId))];
  const subscriptions = await transaction
    .select({ id: webPushSubscription.id, recipientUserId: webPushSubscription.recipientUserId })
    .from(webPushSubscription)
    .where(
      and(
        inArray(webPushSubscription.recipientUserId, recipientIds),
        eq(webPushSubscription.status, "active"),
      ),
    );
  const byRecipient = new Map<string, string[]>();
  for (const subscription of subscriptions) {
    const ids = byRecipient.get(subscription.recipientUserId) ?? [];
    ids.push(subscription.id);
    byRecipient.set(subscription.recipientUserId, ids);
  }
  const deliveries = notifications.flatMap((notification) =>
    (byRecipient.get(notification.recipientUserId) ?? []).map((subscriptionId) => ({
      notificationId: notification.id,
      subscriptionId,
    })),
  );
  if (deliveries.length) {
    await transaction.insert(webPushDelivery).values(deliveries).onConflictDoNothing();
  }
}
