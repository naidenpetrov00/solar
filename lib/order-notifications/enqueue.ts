import "server-only";

import { eq } from "drizzle-orm";

import {
  orderNotificationOutbox,
  orderNotificationRecipient,
} from "@/db/schema";
import { orderNotificationTemplateVersion } from "@/lib/order-notifications/model";
import type { OrderTransaction } from "@/lib/orders/repository-types";

type RevisionRecipient = {
  id: string;
  revisionNumber: number;
  locale: string;
  customerName: string;
  customerEmail: string;
};

async function insertCustomerIntent(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    sourceAuditEventId: string;
    revision: RevisionRecipient;
    kind:
      | "customer_order_received"
      | "customer_order_approved"
      | "customer_order_rejected"
      | "customer_order_cancelled";
  },
) {
  await transaction
    .insert(orderNotificationOutbox)
    .values({
      orderId: input.orderId,
      sourceAuditEventId: input.sourceAuditEventId,
      revisionId: input.revision.id,
      revisionNumber: input.revision.revisionNumber,
      locale: input.revision.locale,
      notificationKind: input.kind,
      recipientType: "customer",
      templateVersion: orderNotificationTemplateVersion,
      customerRecipientName: input.revision.customerName,
      customerRecipientEmail: input.revision.customerEmail,
    })
    .onConflictDoNothing();
}

export async function enqueueNewOrderNotifications(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    sourceAuditEventId: string;
    revision: RevisionRecipient;
  },
) {
  await insertCustomerIntent(transaction, {
    ...input,
    kind: "customer_order_received",
  });
  const recipients = await transaction
    .select({
      id: orderNotificationRecipient.id,
      name: orderNotificationRecipient.name,
      email: orderNotificationRecipient.email,
    })
    .from(orderNotificationRecipient)
    .where(eq(orderNotificationRecipient.active, true));
  if (!recipients.length) return;
  await transaction
    .insert(orderNotificationOutbox)
    .values(
      recipients.map((recipient) => ({
        orderId: input.orderId,
        sourceAuditEventId: input.sourceAuditEventId,
        revisionId: input.revision.id,
        revisionNumber: input.revision.revisionNumber,
        locale: input.revision.locale,
        notificationKind: "internal_new_order" as const,
        recipientType: "internal" as const,
        templateVersion: orderNotificationTemplateVersion,
        recipientConfigurationId: recipient.id,
        internalRecipientName: recipient.name,
        internalRecipientEmail: recipient.email,
      })),
    )
    .onConflictDoNothing();
}

export async function enqueueOrderStatusNotification(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    sourceAuditEventId: string;
    revision: RevisionRecipient;
    status: "approved" | "rejected" | "cancelled";
  },
) {
  await insertCustomerIntent(transaction, {
    orderId: input.orderId,
    sourceAuditEventId: input.sourceAuditEventId,
    revision: input.revision,
    kind: `customer_order_${input.status}`,
  });
}
