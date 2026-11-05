import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";
import { catalogProduct } from "@/db/schema/catalog-products";
import { catalogPromotion } from "@/db/schema/catalog-promotions";
import { salesOrderRevision } from "@/db/schema/order-core";

export const salesOrderItemSnapshot = pgTable(
  "sales_order_item_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => salesOrderRevision.id, { onDelete: "cascade" }),
    lineKey: uuid("line_key").notNull(),
    position: integer("position").notNull(),
    sourceProductId: uuid("source_product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    localizedTitle: text("localized_title").notNull(),
    titleLocale: text("title_locale").notNull(),
    quantity: integer("quantity").notNull(),
    currency: text("currency").default("EUR").notNull(),
    vatRateBasisPoints: integer("vat_rate_basis_points").notNull(),
    catalogUnitNetMinor: bigint("catalog_unit_net_minor", {
      mode: "bigint",
    }).notNull(),
    catalogUnitGrossMinor: bigint("catalog_unit_gross_minor", {
      mode: "bigint",
    }).notNull(),
    sourcePromotionId: uuid("source_promotion_id").references(
      () => catalogPromotion.id,
      { onDelete: "restrict" },
    ),
    promotionInternalName: text("promotion_internal_name"),
    promotionPublicLabel: text("promotion_public_label"),
    promotionDiscountType: text("promotion_discount_type"),
    promotionPercentageBasisPoints: integer("promotion_percentage_basis_points"),
    promotionFixedGrossMinor: bigint("promotion_fixed_gross_minor", {
      mode: "bigint",
    }),
    promotionUnitDiscountGrossMinor: bigint(
      "promotion_unit_discount_gross_minor",
      { mode: "bigint" },
    ).notNull(),
    effectiveCatalogUnitNetMinor: bigint("effective_catalog_unit_net_minor", {
      mode: "bigint",
    }).notNull(),
    effectiveCatalogUnitGrossMinor: bigint(
      "effective_catalog_unit_gross_minor",
      { mode: "bigint" },
    ).notNull(),
    manualUnitAdjustmentGrossMinor: bigint(
      "manual_unit_adjustment_gross_minor",
      { mode: "bigint" },
    ).notNull(),
    finalUnitNetMinor: bigint("final_unit_net_minor", { mode: "bigint" }).notNull(),
    finalUnitVatMinor: bigint("final_unit_vat_minor", { mode: "bigint" }).notNull(),
    finalUnitGrossMinor: bigint("final_unit_gross_minor", {
      mode: "bigint",
    }).notNull(),
    lineNetMinor: bigint("line_net_minor", { mode: "bigint" }).notNull(),
    lineVatMinor: bigint("line_vat_minor", { mode: "bigint" }).notNull(),
    lineGrossMinor: bigint("line_gross_minor", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_order_item_snapshot_revision_id_unique").on(
      table.revisionId,
      table.id,
    ),
    unique("sales_order_item_snapshot_revision_line_unique").on(
      table.revisionId,
      table.lineKey,
    ),
    unique("sales_order_item_snapshot_revision_position_unique").on(
      table.revisionId,
      table.position,
    ),
    index("sales_order_item_snapshot_product_idx").on(table.sourceProductId),
    index("sales_order_item_snapshot_promotion_idx").on(table.sourcePromotionId),
    check(
      "sales_order_item_snapshot_identity_check",
      sql`${table.position} >= 0
        AND char_length(${table.sku}) BETWEEN 1 AND 100
        AND char_length(${table.localizedTitle}) BETWEEN 1 AND 200
        AND ${table.titleLocale} IN ('bg', 'en', 'tr', 'uk')
        AND ${table.quantity} BETWEEN 1 AND 999`,
    ),
    check(
      "sales_order_item_snapshot_money_check",
      sql`${table.currency} = 'EUR'
        AND ${table.vatRateBasisPoints} = 2000
        AND ${table.catalogUnitNetMinor} > 0
        AND ${table.catalogUnitGrossMinor} > 0
        AND ${table.promotionUnitDiscountGrossMinor} >= 0
        AND ${table.catalogUnitGrossMinor} - ${table.promotionUnitDiscountGrossMinor} = ${table.effectiveCatalogUnitGrossMinor}
        AND ${table.effectiveCatalogUnitNetMinor} > 0
        AND ${table.effectiveCatalogUnitGrossMinor} > 0
        AND ${table.effectiveCatalogUnitGrossMinor} + ${table.manualUnitAdjustmentGrossMinor} = ${table.finalUnitGrossMinor}
        AND ${table.finalUnitNetMinor} > 0
        AND ${table.finalUnitVatMinor} >= 0
        AND ${table.finalUnitGrossMinor} > 0
        AND ${table.finalUnitNetMinor} + ${table.finalUnitVatMinor} = ${table.finalUnitGrossMinor}
        AND ${table.finalUnitNetMinor} * ${table.quantity} = ${table.lineNetMinor}
        AND ${table.finalUnitVatMinor} * ${table.quantity} = ${table.lineVatMinor}
        AND ${table.finalUnitGrossMinor} * ${table.quantity} = ${table.lineGrossMinor}`,
    ),
    check(
      "sales_order_item_snapshot_promotion_check",
      sql`(
        ${table.sourcePromotionId} IS NULL
        AND num_nonnulls(${table.promotionInternalName}, ${table.promotionPublicLabel}, ${table.promotionDiscountType}, ${table.promotionPercentageBasisPoints}, ${table.promotionFixedGrossMinor}) = 0
        AND ${table.promotionUnitDiscountGrossMinor} = 0
      ) OR (
        ${table.sourcePromotionId} IS NOT NULL
        AND ${table.promotionInternalName} IS NOT NULL
        AND ${table.promotionDiscountType} = 'percentage'
        AND ${table.promotionPercentageBasisPoints} BETWEEN 1 AND 9999
        AND ${table.promotionFixedGrossMinor} IS NULL
        AND ${table.promotionUnitDiscountGrossMinor} > 0
      ) OR (
        ${table.sourcePromotionId} IS NOT NULL
        AND ${table.promotionInternalName} IS NOT NULL
        AND ${table.promotionDiscountType} = 'fixed_eur'
        AND ${table.promotionPercentageBasisPoints} IS NULL
        AND ${table.promotionFixedGrossMinor} > 0
        AND ${table.promotionUnitDiscountGrossMinor} > 0
      )`,
    ),
  ],
);

export const salesOrderPriceAdjustment = pgTable(
  "sales_order_price_adjustment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => salesOrderRevision.id, { onDelete: "cascade" }),
    adjustmentKey: uuid("adjustment_key").notNull(),
    scope: text("scope").notNull(),
    itemSnapshotId: uuid("item_snapshot_id"),
    amountGrossMinor: bigint("amount_gross_minor", { mode: "bigint" }).notNull(),
    reason: text("reason").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("sales_order_price_adjustment_revision_key_unique").on(
      table.revisionId,
      table.adjustmentKey,
    ),
    foreignKey({
      name: "sales_order_price_adjustment_item_revision_fk",
      columns: [table.revisionId, table.itemSnapshotId],
      foreignColumns: [
        salesOrderItemSnapshot.revisionId,
        salesOrderItemSnapshot.id,
      ],
    }).onDelete("cascade"),
    index("sales_order_price_adjustment_revision_idx").on(table.revisionId),
    check(
      "sales_order_price_adjustment_scope_check",
      sql`(${table.scope} = 'item' AND ${table.itemSnapshotId} IS NOT NULL)
        OR (${table.scope} = 'order' AND ${table.itemSnapshotId} IS NULL)`,
    ),
    check(
      "sales_order_price_adjustment_value_check",
      sql`${table.amountGrossMinor} <> 0
        AND char_length(btrim(${table.reason})) BETWEEN 1 AND 500`,
    ),
    check(
      "sales_order_price_adjustment_actor_check",
      sql`char_length(btrim(${table.actorName})) BETWEEN 1 AND 100
        AND char_length(${table.actorEmail}) BETWEEN 3 AND 320
        AND ${table.actorRole} IN ('administrator', 'admin')`,
    ),
  ],
);
