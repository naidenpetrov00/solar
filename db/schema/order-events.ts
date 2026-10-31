import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";
import { salesOrder } from "@/db/schema/order-core";

export type OrderAuditChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export const salesOrderAuditEvent = pgTable(
  "sales_order_audit_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrder.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    mutationVersion: integer("mutation_version").notNull(),
    fromRevisionNumber: integer("from_revision_number"),
    toRevisionNumber: integer("to_revision_number"),
    fromOrderStatus: text("from_order_status"),
    toOrderStatus: text("to_order_status"),
    fromPaymentStatus: text("from_payment_status"),
    toPaymentStatus: text("to_payment_status"),
    changes: jsonb("changes").$type<OrderAuditChange[]>().notNull(),
    actorKind: text("actor_kind").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    actorRole: text("actor_role"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_order_audit_event_order_version_unique").on(
      table.orderId,
      table.mutationVersion,
    ),
    index("sales_order_audit_event_order_occurred_idx").on(
      table.orderId,
      table.occurredAt,
    ),
    check(
      "sales_order_audit_event_type_check",
      sql`${table.eventType} IN ('submitted', 'content_revised', 'order_status_changed', 'payment_status_changed')`,
    ),
    check(
      "sales_order_audit_event_version_check",
      sql`${table.mutationVersion} >= 1
        AND (${table.fromRevisionNumber} IS NULL OR ${table.fromRevisionNumber} >= 1)
        AND (${table.toRevisionNumber} IS NULL OR ${table.toRevisionNumber} >= 1)`,
    ),
    check(
      "sales_order_audit_event_actor_check",
      sql`(
        ${table.actorKind} = 'guest'
        AND num_nonnulls(${table.actorUserId}, ${table.actorName}, ${table.actorEmail}, ${table.actorRole}) = 0
      ) OR (
        ${table.actorKind} = 'administrator'
        AND ${table.actorName} IS NOT NULL
        AND ${table.actorEmail} IS NOT NULL
        AND ${table.actorRole} IN ('administrator', 'admin')
      )`,
    ),
    check(
      "sales_order_audit_event_order_status_check",
      sql`(${table.fromOrderStatus} IS NULL OR ${table.fromOrderStatus} IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed'))
        AND (${table.toOrderStatus} IS NULL OR ${table.toOrderStatus} IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed'))`,
    ),
    check(
      "sales_order_audit_event_payment_status_check",
      sql`(${table.fromPaymentStatus} IS NULL OR ${table.fromPaymentStatus} IN ('unpaid', 'partially_paid', 'paid', 'failed', 'partially_refunded', 'refunded'))
        AND (${table.toPaymentStatus} IS NULL OR ${table.toPaymentStatus} IN ('unpaid', 'partially_paid', 'paid', 'failed', 'partially_refunded', 'refunded'))`,
    ),
  ],
);
