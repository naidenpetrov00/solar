import "server-only";

import { and, eq, isNull, or, type SQL } from "drizzle-orm";

import { userNotification } from "@/db/schema";
import { authorizedNotificationIdentities } from "@/lib/in-app-notifications/registry";
import {
  notificationUnreadMaximum,
  type NotificationUnreadSummary,
} from "@/lib/in-app-notifications/model";
import type { OrderExecutor } from "@/lib/orders/repository-types";
import { AuthorizationError } from "@/lib/permission-policy";

export function notificationIdentityCondition(role: unknown): SQL {
  const identities = authorizedNotificationIdentities(role);
  if (!identities.length) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }
  return or(
    ...identities.map((identity) =>
      and(
        eq(userNotification.kind, identity.kind),
        eq(userNotification.payloadVersion, identity.payloadVersion),
      ),
    ),
  ) as SQL;
}

export async function unreadSummaryFor(
  executor: OrderExecutor,
  recipientUserId: string,
  role: unknown,
): Promise<NotificationUnreadSummary> {
  const rows = await executor
    .select({ id: userNotification.id })
    .from(userNotification)
    .where(
      and(
        eq(userNotification.recipientUserId, recipientUserId),
        notificationIdentityCondition(role),
        isNull(userNotification.readAt),
      ),
    )
    .limit(notificationUnreadMaximum + 1);

  return {
    count: Math.min(rows.length, notificationUnreadMaximum),
    overflow: rows.length > notificationUnreadMaximum,
  };
}
