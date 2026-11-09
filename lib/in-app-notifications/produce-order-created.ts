import "server-only";

import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { user, userNotification } from "@/db/schema";
import { appRoles } from "@/lib/auth-role-config";
import { createOrderCreatedPayload } from "@/lib/in-app-notifications/registry";
import type { OrderTransaction } from "@/lib/orders/repository-types";
import { hasPermission } from "@/lib/permission-policy";

export async function createOrderCreatedNotifications(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    orderNumber: string;
    sourceAuditEventId: string;
  },
) {
  const viewerRoles = appRoles.filter((role) =>
    hasPermission(role, "order:view"),
  );
  if (!viewerRoles.length) return;
  const now = new Date();
  const recipients = await transaction
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        inArray(user.role, viewerRoles),
        or(
          isNull(user.banned),
          eq(user.banned, false),
          and(eq(user.banned, true), lte(user.banExpires, now)),
        ),
      ),
    );

  if (!recipients.length) return;
  const payload = createOrderCreatedPayload(input.orderId, input.orderNumber);
  const deduplicationKey = `order_created:v1:${input.sourceAuditEventId}`;

  await transaction
    .insert(userNotification)
    .values(
      recipients.map(({ id }) => ({
        recipientUserId: id,
        kind: "order_created",
        payloadVersion: 1,
        payload,
        deduplicationKey,
      })),
    )
    .onConflictDoNothing({
      target: [
        userNotification.recipientUserId,
        userNotification.deduplicationKey,
      ],
    });
}
