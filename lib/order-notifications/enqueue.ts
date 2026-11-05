import "server-only";

import { eq } from "drizzle-orm";

import {
  orderNotificationOutbox,
  orderNotificationRecipient,
  user,
} from "@/db/schema";
import {
  customerOrderNotificationTemplateVersion,
  internalOrderNotificationTemplateVersion,
} from "@/lib/order-notifications/model";
import { usableOrderNotificationUser } from "@/lib/order-notifications/user-recipient";
import type { OrderTransaction } from "@/lib/orders/repository-types";
import { hasPermission } from "@/lib/permission-policy";
import { getPublicSiteUrl } from "@/lib/server-env";

type RevisionRecipient = {
  id: string;
  revisionNumber: number;
  locale: string;
  customerName: string;
  customerEmail: string;
};

function customerViewOrderUrl(
  locale: string,
  orderId: string,
  customerUserId: string | null,
) {
  if (!customerUserId) return null;
  const slug = `account/orders/${orderId}`;
  return new URL(
    locale === "bg" ? `/${slug}` : `/${locale}/${slug}`,
    getPublicSiteUrl(),
  ).toString();
}

async function insertCustomerIntent(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    sourceAuditEventId: string;
    revision: RevisionRecipient;
    customerUserId: string | null;
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
      templateVersion: customerOrderNotificationTemplateVersion,
      customerRecipientName: input.revision.customerName,
      customerRecipientEmail: input.revision.customerEmail,
      customerViewOrderUrl: customerViewOrderUrl(
        input.revision.locale,
        input.orderId,
        input.customerUserId,
      ),
    })
    .onConflictDoNothing();
}

export async function enqueueNewOrderNotifications(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    sourceAuditEventId: string;
    revision: RevisionRecipient;
    customerUserId: string | null;
  },
) {
  await insertCustomerIntent(transaction, {
    ...input,
    kind: "customer_order_received",
  });
  const recipients = await transaction
    .select({
      id: orderNotificationRecipient.id,
      name: user.name,
      email: user.email,
      role: user.role,
      blocked: user.banned,
    })
    .from(orderNotificationRecipient)
    .innerJoin(user, eq(orderNotificationRecipient.userId, user.id))
    .where(eq(orderNotificationRecipient.active, true));
  const eligibleRecipients = recipients.flatMap((recipient) => {
    if (
      recipient.blocked === true ||
      !hasPermission(recipient.role, "order:view")
    ) {
      return [];
    }

    const snapshot = usableOrderNotificationUser(recipient);
    return snapshot ? [{ id: recipient.id, ...snapshot }] : [];
  });
  if (!eligibleRecipients.length) return;
  await transaction
    .insert(orderNotificationOutbox)
    .values(
      eligibleRecipients.map((recipient) => ({
        orderId: input.orderId,
        sourceAuditEventId: input.sourceAuditEventId,
        revisionId: input.revision.id,
        revisionNumber: input.revision.revisionNumber,
        locale: input.revision.locale,
        notificationKind: "internal_new_order" as const,
        recipientType: "internal" as const,
        templateVersion: internalOrderNotificationTemplateVersion,
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
    customerUserId: string | null;
    status: "approved" | "rejected" | "cancelled";
  },
) {
  await insertCustomerIntent(transaction, {
    orderId: input.orderId,
    sourceAuditEventId: input.sourceAuditEventId,
    revision: input.revision,
    customerUserId: input.customerUserId,
    kind: `customer_order_${input.status}`,
  });
}
