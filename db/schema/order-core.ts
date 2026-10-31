import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";

export const salesOrder = pgTable(
  "sales_order",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumberSequence: bigint("order_number_sequence", { mode: "bigint" })
      .generatedAlwaysAsIdentity({ startWith: 1 })
      .notNull(),
    orderNumber: text("order_number")
      .notNull()
      .generatedAlwaysAs(
        sql`'ORD-' || lpad("order_number_sequence"::text, greatest(6, length("order_number_sequence"::text)), '0')`,
      ),
    submissionKey: uuid("submission_key").notNull(),
    submissionFingerprint: text("submission_fingerprint").notNull(),
    status: text("status").default("pending_approval").notNull(),
    paymentStatus: text("payment_status").default("unpaid").notNull(),
    currentRevisionNumber: integer("current_revision_number").default(1).notNull(),
    mutationVersion: integer("mutation_version").default(1).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    paymentStatusUpdatedAt: timestamp("payment_status_updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("sales_order_number_idx").on(table.orderNumber),
    uniqueIndex("sales_order_submission_key_idx").on(table.submissionKey),
    index("sales_order_status_submitted_idx").on(table.status, table.submittedAt),
    index("sales_order_payment_status_updated_idx").on(
      table.paymentStatus,
      table.paymentStatusUpdatedAt,
    ),
    index("sales_order_approved_idx").on(table.approvedAt),
    index("sales_order_cancelled_idx").on(table.cancelledAt),
    index("sales_order_completed_idx").on(table.completedAt),
    check(
      "sales_order_submission_fingerprint_check",
      sql`${table.submissionFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "sales_order_status_check",
      sql`${table.status} IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed')`,
    ),
    check(
      "sales_order_payment_status_check",
      sql`${table.paymentStatus} IN ('unpaid', 'partially_paid', 'paid', 'failed', 'partially_refunded', 'refunded')`,
    ),
    check(
      "sales_order_version_check",
      sql`${table.currentRevisionNumber} >= 1 AND ${table.mutationVersion} >= ${table.currentRevisionNumber}`,
    ),
    check(
      "sales_order_lifecycle_timestamps_check",
      sql`(
        ${table.status} = 'pending_approval'
        AND num_nonnulls(${table.approvedAt}, ${table.rejectedAt}, ${table.cancelledAt}, ${table.completedAt}) = 0
      ) OR (
        ${table.status} = 'approved'
        AND ${table.approvedAt} IS NOT NULL
        AND num_nonnulls(${table.rejectedAt}, ${table.cancelledAt}, ${table.completedAt}) = 0
      ) OR (
        ${table.status} = 'rejected'
        AND ${table.rejectedAt} IS NOT NULL
        AND num_nonnulls(${table.approvedAt}, ${table.cancelledAt}, ${table.completedAt}) = 0
      ) OR (
        ${table.status} = 'cancelled'
        AND ${table.cancelledAt} IS NOT NULL
        AND num_nonnulls(${table.rejectedAt}, ${table.completedAt}) = 0
      ) OR (
        ${table.status} = 'completed'
        AND ${table.approvedAt} IS NOT NULL
        AND ${table.completedAt} IS NOT NULL
        AND num_nonnulls(${table.rejectedAt}, ${table.cancelledAt}) = 0
      )`,
    ),
    check(
      "sales_order_payment_timestamps_check",
      sql`(${table.paymentStatus} <> 'paid' OR ${table.paidAt} IS NOT NULL)
        AND (${table.paymentStatus} <> 'refunded' OR ${table.refundedAt} IS NOT NULL)`,
    ),
  ],
);

export const salesOrderRevision = pgTable(
  "sales_order_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrder.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    revisionKind: text("revision_kind").notNull(),
    locale: text("locale").notNull(),
    customerName: text("customer_name").notNull(),
    customerNameNormalized: text("customer_name_normalized").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerPhoneNormalized: text("customer_phone_normalized").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerEmailNormalized: text("customer_email_normalized").notNull(),
    city: text("city").notNull(),
    cityNormalized: text("city_normalized").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    deliveryAddressNormalized: text("delivery_address_normalized").notNull(),
    customerNote: text("customer_note"),
    paymentMethod: text("payment_method").notNull(),
    currency: text("currency").default("EUR").notNull(),
    calculationVersion: integer("calculation_version").default(1).notNull(),
    catalogSubtotalGrossMinor: bigint("catalog_subtotal_gross_minor", {
      mode: "bigint",
    }).notNull(),
    promotionDiscountGrossMinor: bigint("promotion_discount_gross_minor", {
      mode: "bigint",
    }).notNull(),
    itemAdjustmentGrossMinor: bigint("item_adjustment_gross_minor", {
      mode: "bigint",
    }).notNull(),
    itemsNetMinor: bigint("items_net_minor", { mode: "bigint" }).notNull(),
    itemsVatMinor: bigint("items_vat_minor", { mode: "bigint" }).notNull(),
    itemsGrossMinor: bigint("items_gross_minor", { mode: "bigint" }).notNull(),
    orderAdjustmentNetMinor: bigint("order_adjustment_net_minor", {
      mode: "bigint",
    }).notNull(),
    orderAdjustmentVatMinor: bigint("order_adjustment_vat_minor", {
      mode: "bigint",
    }).notNull(),
    orderAdjustmentGrossMinor: bigint("order_adjustment_gross_minor", {
      mode: "bigint",
    }).notNull(),
    totalNetMinor: bigint("total_net_minor", { mode: "bigint" }).notNull(),
    totalVatMinor: bigint("total_vat_minor", { mode: "bigint" }).notNull(),
    totalGrossMinor: bigint("total_gross_minor", { mode: "bigint" }).notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_order_revision_order_number_unique").on(
      table.orderId,
      table.revisionNumber,
    ),
    index("sales_order_revision_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
    index("sales_order_revision_customer_email_idx").on(
      table.customerEmailNormalized,
    ),
    index("sales_order_revision_customer_name_idx").on(
      table.customerNameNormalized,
    ),
    index("sales_order_revision_delivery_address_idx").on(
      table.deliveryAddressNormalized,
    ),
    check(
      "sales_order_revision_identity_check",
      sql`${table.revisionNumber} >= 1
        AND ((${table.revisionNumber} = 1 AND ${table.revisionKind} = 'customer_submission')
          OR (${table.revisionNumber} > 1 AND ${table.revisionKind} = 'administrator_edit'))`,
    ),
    check(
      "sales_order_revision_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "sales_order_revision_contact_check",
      sql`char_length(${table.customerName}) BETWEEN 2 AND 100
        AND char_length(${table.customerNameNormalized}) BETWEEN 2 AND 100
        AND char_length(${table.customerPhone}) BETWEEN 7 AND 32
        AND char_length(${table.customerPhoneNormalized}) BETWEEN 7 AND 21
        AND char_length(${table.customerEmail}) BETWEEN 3 AND 320
        AND char_length(${table.customerEmailNormalized}) BETWEEN 3 AND 320
        AND char_length(${table.city}) BETWEEN 2 AND 120
        AND char_length(${table.cityNormalized}) BETWEEN 2 AND 120
        AND char_length(${table.deliveryAddress}) BETWEEN 5 AND 500
        AND char_length(${table.deliveryAddressNormalized}) BETWEEN 5 AND 500
        AND (${table.customerNote} IS NULL OR char_length(${table.customerNote}) BETWEEN 1 AND 2000)`,
    ),
    check(
      "sales_order_revision_payment_method_check",
      sql`${table.paymentMethod} IN ('cash_on_delivery', 'bank_transfer', 'arranged_by_phone')`,
    ),
    check("sales_order_revision_currency_check", sql`${table.currency} = 'EUR'`),
    check(
      "sales_order_revision_calculation_version_check",
      sql`${table.calculationVersion} = 1`,
    ),
    check(
      "sales_order_revision_totals_check",
      sql`${table.catalogSubtotalGrossMinor} > 0
        AND ${table.promotionDiscountGrossMinor} >= 0
        AND ${table.itemsNetMinor} > 0
        AND ${table.itemsVatMinor} >= 0
        AND ${table.itemsGrossMinor} > 0
        AND ${table.totalNetMinor} > 0
        AND ${table.totalVatMinor} >= 0
        AND ${table.totalGrossMinor} > 0
        AND ${table.itemsNetMinor} + ${table.itemsVatMinor} = ${table.itemsGrossMinor}
        AND ${table.catalogSubtotalGrossMinor} - ${table.promotionDiscountGrossMinor} + ${table.itemAdjustmentGrossMinor} = ${table.itemsGrossMinor}
        AND ${table.orderAdjustmentNetMinor} + ${table.orderAdjustmentVatMinor} = ${table.orderAdjustmentGrossMinor}
        AND ${table.itemsNetMinor} + ${table.orderAdjustmentNetMinor} = ${table.totalNetMinor}
        AND ${table.itemsVatMinor} + ${table.orderAdjustmentVatMinor} = ${table.totalVatMinor}
        AND ${table.itemsGrossMinor} + ${table.orderAdjustmentGrossMinor} = ${table.totalGrossMinor}`,
    ),
  ],
);
