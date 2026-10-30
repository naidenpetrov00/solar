import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { catalogCategory } from "@/db/schema/catalog-categories";
import { catalogProduct } from "@/db/schema/catalog-products";

export const catalogPromotion = pgTable(
  "catalog_promotion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    internalName: text("internal_name").notNull(),
    discountType: text("discount_type").notNull(),
    scope: text("scope").notNull(),
    percentageBasisPoints: integer("percentage_basis_points"),
    fixedVatInclusiveMinor: bigint("fixed_vat_inclusive_minor", {
      mode: "bigint",
    }),
    isActive: boolean("is_active").default(false).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("catalog_promotion_activity_idx").on(
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
    check(
      "catalog_promotion_internal_name_check",
      sql`${table.internalName} = btrim(${table.internalName}) AND char_length(${table.internalName}) BETWEEN 1 AND 200`,
    ),
    check(
      "catalog_promotion_discount_type_check",
      sql`${table.discountType} IN ('percentage', 'fixed_eur')`,
    ),
    check(
      "catalog_promotion_scope_check",
      sql`${table.scope} IN ('catalog', 'category', 'product')`,
    ),
    check(
      "catalog_promotion_value_check",
      sql`(
        ${table.discountType} = 'percentage'
        AND ${table.percentageBasisPoints} BETWEEN 1 AND 9999
        AND ${table.fixedVatInclusiveMinor} IS NULL
      ) OR (
        ${table.discountType} = 'fixed_eur'
        AND ${table.percentageBasisPoints} IS NULL
        AND ${table.fixedVatInclusiveMinor} > 0
      )`,
    ),
    check(
      "catalog_promotion_schedule_check",
      sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const catalogPromotionTranslation = pgTable(
  "catalog_promotion_translation",
  {
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => catalogPromotion.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    publicLabel: text("public_label"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.promotionId, table.locale] }),
    check(
      "catalog_promotion_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_promotion_translation_public_label_check",
      sql`${table.publicLabel} IS NULL OR (${table.publicLabel} = btrim(${table.publicLabel}) AND char_length(${table.publicLabel}) BETWEEN 1 AND 200)`,
    ),
  ],
);

export const catalogPromotionCategory = pgTable(
  "catalog_promotion_category",
  {
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => catalogPromotion.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategory.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.promotionId, table.categoryId] }),
    index("catalog_promotion_category_category_idx").on(
      table.categoryId,
      table.promotionId,
    ),
  ],
);

export const catalogPromotionProduct = pgTable(
  "catalog_promotion_product",
  {
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => catalogPromotion.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.promotionId, table.productId] }),
    index("catalog_promotion_product_product_idx").on(
      table.productId,
      table.promotionId,
    ),
  ],
);

export const catalogPromotionRelations = relations(
  catalogPromotion,
  ({ many }) => ({
    translations: many(catalogPromotionTranslation),
    categories: many(catalogPromotionCategory),
    products: many(catalogPromotionProduct),
  }),
);

export const catalogPromotionTranslationRelations = relations(
  catalogPromotionTranslation,
  ({ one }) => ({
    promotion: one(catalogPromotion, {
      fields: [catalogPromotionTranslation.promotionId],
      references: [catalogPromotion.id],
    }),
  }),
);

export const catalogPromotionCategoryRelations = relations(
  catalogPromotionCategory,
  ({ one }) => ({
    promotion: one(catalogPromotion, {
      fields: [catalogPromotionCategory.promotionId],
      references: [catalogPromotion.id],
    }),
    category: one(catalogCategory, {
      fields: [catalogPromotionCategory.categoryId],
      references: [catalogCategory.id],
    }),
  }),
);

export const catalogPromotionProductRelations = relations(
  catalogPromotionProduct,
  ({ one }) => ({
    promotion: one(catalogPromotion, {
      fields: [catalogPromotionProduct.promotionId],
      references: [catalogPromotion.id],
    }),
    product: one(catalogProduct, {
      fields: [catalogPromotionProduct.productId],
      references: [catalogProduct.id],
    }),
  }),
);
