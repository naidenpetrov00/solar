import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { userNotification } from "@/db/schema";
import { requireUser } from "@/lib/authorization";
import { isUuid } from "@/lib/catalog/model";
import { InAppNotificationError } from "@/lib/in-app-notifications/errors";
import {
  notificationIdentityCondition,
  unreadSummaryFor,
} from "@/lib/in-app-notifications/repository";
import { presentStoredNotification } from "@/lib/in-app-notifications/registry";

export async function markCurrentUserNotificationRead(notificationId: string) {
  if (!isUuid(notificationId)) {
    throw new InAppNotificationError("INVALID_INPUT");
  }
  const currentUser = await requireUser();
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .select()
      .from(userNotification)
      .where(
        and(
          eq(userNotification.id, notificationId),
          eq(userNotification.recipientUserId, currentUser.id),
        ),
      )
      .limit(1)
      .for("update");
    if (!row) throw new InAppNotificationError("NOT_FOUND");

    const presentation = presentStoredNotification(row, currentUser.role);
    if (!row.readAt) {
      await transaction
        .update(userNotification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(userNotification.id, row.id),
            eq(userNotification.recipientUserId, currentUser.id),
            isNull(userNotification.readAt),
          ),
        );
    }
    return {
      target: presentation.target,
      unread: await unreadSummaryFor(
        transaction,
        currentUser.id,
        currentUser.role,
      ),
    };
  });
}

export async function markAllCurrentUserNotificationsRead() {
  const currentUser = await requireUser();
  return db.transaction(async (transaction) => {
    await transaction
      .update(userNotification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(userNotification.recipientUserId, currentUser.id),
          isNull(userNotification.readAt),
          notificationIdentityCondition(currentUser.role),
        ),
      );
    return unreadSummaryFor(transaction, currentUser.id, currentUser.role);
  });
}
