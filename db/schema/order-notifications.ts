import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { salesOrder, salesOrderRevision } from "@/db/schema/order-core";
import { salesOrderAuditEvent } from "@/db/schema/order-events";

export const orderNotificationRecipient = pgTable(
  "order_notification_recipient",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    active: boolean("active").default(true).notNull(),
    mutationVersion: integer("mutation_version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("order_notification_recipient_active_email_idx")
      .on(table.emailNormalized)
      .where(sql`${table.active} = true`),
    index("order_notification_recipient_active_name_idx").on(
      table.active,
      table.name,
    ),
    check(
      "order_notification_recipient_values_check",
      sql`char_length(${table.name}) BETWEEN 2 AND 100
        AND char_length(${table.email}) BETWEEN 3 AND 320
        AND char_length(${table.emailNormalized}) BETWEEN 3 AND 320
        AND ${table.emailNormalized} = lower(${table.emailNormalized})
        AND ${table.mutationVersion} >= 1`,
    ),
  ],
);

export const orderNotificationOutbox = pgTable(
  "order_notification_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrder.id, { onDelete: "restrict" }),
    sourceAuditEventId: uuid("source_audit_event_id")
      .notNull()
      .references(() => salesOrderAuditEvent.id, { onDelete: "restrict" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => salesOrderRevision.id, { onDelete: "restrict" }),
    revisionNumber: integer("revision_number").notNull(),
    locale: text("locale").notNull(),
    notificationKind: text("notification_kind").notNull(),
    recipientType: text("recipient_type").notNull(),
    templateVersion: integer("template_version").notNull(),
    recipientConfigurationId: uuid("recipient_configuration_id").references(
      () => orderNotificationRecipient.id,
      { onDelete: "restrict" },
    ),
    customerRecipientName: text("customer_recipient_name"),
    customerRecipientEmail: text("customer_recipient_email"),
    internalRecipientName: text("internal_recipient_name"),
    internalRecipientEmail: text("internal_recipient_email"),
    status: text("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    cycleAttemptCount: integer("cycle_attempt_count").default(0).notNull(),
    manualRetryCount: integer("manual_retry_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow(),
    claimToken: uuid("claim_token"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    failureDisposition: text("failure_disposition"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    mutationVersion: integer("mutation_version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("order_notification_outbox_customer_event_kind_idx")
      .on(table.sourceAuditEventId, table.notificationKind)
      .where(sql`${table.recipientType} = 'customer'`),
    uniqueIndex("order_notification_outbox_internal_event_kind_recipient_idx")
      .on(
        table.sourceAuditEventId,
        table.notificationKind,
        table.recipientConfigurationId,
      )
      .where(sql`${table.recipientType} = 'internal'`),
    index("order_notification_outbox_due_idx").on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index("order_notification_outbox_stale_claim_idx").on(
      table.status,
      table.claimedAt,
    ),
    index("order_notification_outbox_order_history_idx").on(
      table.orderId,
      table.createdAt,
    ),
    check(
      "order_notification_outbox_recipient_shape_check",
      sql`(
        ${table.notificationKind} IN ('customer_order_received', 'customer_order_approved', 'customer_order_rejected', 'customer_order_cancelled')
        AND ${table.recipientType} = 'customer'
        AND ${table.recipientConfigurationId} IS NULL
        AND ${table.customerRecipientName} IS NOT NULL
        AND ${table.customerRecipientEmail} IS NOT NULL
        AND ${table.internalRecipientName} IS NULL
        AND ${table.internalRecipientEmail} IS NULL
      ) OR (
        ${table.notificationKind} = 'internal_new_order'
        AND ${table.recipientType} = 'internal'
        AND ${table.recipientConfigurationId} IS NOT NULL
        AND ${table.customerRecipientName} IS NULL
        AND ${table.customerRecipientEmail} IS NULL
        AND ${table.internalRecipientName} IS NOT NULL
        AND ${table.internalRecipientEmail} IS NOT NULL
      )`,
    ),
    check(
      "order_notification_outbox_identity_check",
      sql`${table.revisionNumber} >= 1
        AND ${table.locale} IN ('bg', 'en', 'tr', 'uk')
        AND ${table.templateVersion} >= 1
        AND ${table.mutationVersion} >= 1
        AND ${table.attemptCount} >= 0
        AND ${table.cycleAttemptCount} >= 0
        AND ${table.attemptCount} >= ${table.cycleAttemptCount}
        AND ${table.manualRetryCount} >= 0`,
    ),
    check(
      "order_notification_outbox_recipient_values_check",
      sql`(${table.customerRecipientName} IS NULL OR char_length(${table.customerRecipientName}) BETWEEN 2 AND 100)
        AND (${table.customerRecipientEmail} IS NULL OR char_length(${table.customerRecipientEmail}) BETWEEN 3 AND 320)
        AND (${table.internalRecipientName} IS NULL OR char_length(${table.internalRecipientName}) BETWEEN 2 AND 100)
        AND (${table.internalRecipientEmail} IS NULL OR char_length(${table.internalRecipientEmail}) BETWEEN 3 AND 320)`,
    ),
    check(
      "order_notification_outbox_error_code_check",
      sql`${table.lastErrorCode} IS NULL OR ${table.lastErrorCode} IN ('SMTP_TEMPORARY', 'SMTP_PERMANENT', 'COMPOSITION_FAILED', 'TEMPLATE_UNSUPPORTED', 'SNAPSHOT_INVALID')`,
    ),
    check(
      "order_notification_outbox_state_check",
      sql`(
        ${table.status} = 'pending'
        AND ${table.nextAttemptAt} IS NOT NULL
        AND num_nonnulls(${table.claimToken}, ${table.claimedAt}, ${table.sentAt}, ${table.failedAt}, ${table.failureDisposition}, ${table.lastErrorCode}) = 0
      ) OR (
        ${table.status} = 'processing'
        AND ${table.nextAttemptAt} IS NULL
        AND ${table.claimToken} IS NOT NULL
        AND ${table.claimedAt} IS NOT NULL
        AND ${table.lastAttemptAt} IS NOT NULL
        AND ${table.attemptCount} >= 1
        AND num_nonnulls(${table.sentAt}, ${table.failedAt}, ${table.failureDisposition}, ${table.lastErrorCode}) = 0
      ) OR (
        ${table.status} = 'sent'
        AND ${table.nextAttemptAt} IS NULL
        AND ${table.claimToken} IS NULL
        AND ${table.claimedAt} IS NULL
        AND ${table.sentAt} IS NOT NULL
        AND ${table.lastAttemptAt} IS NOT NULL
        AND ${table.attemptCount} >= 1
        AND num_nonnulls(${table.failedAt}, ${table.failureDisposition}, ${table.lastErrorCode}) = 0
      ) OR (
        ${table.status} = 'failed'
        AND ${table.nextAttemptAt} IS NULL
        AND ${table.claimToken} IS NULL
        AND ${table.claimedAt} IS NULL
        AND ${table.sentAt} IS NULL
        AND ${table.failedAt} IS NOT NULL
        AND ${table.lastAttemptAt} IS NOT NULL
        AND ${table.attemptCount} >= 1
        AND ${table.failureDisposition} IN ('permanent', 'retry_exhausted')
        AND ${table.lastErrorCode} IS NOT NULL
      )`,
    ),
  ],
);
