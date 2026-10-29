import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { catalogProduct } from "@/db/schema/catalog-products";
import { catalogManagedAsset } from "@/db/schema/catalog-assets";

export const catalogProductMedia = pgTable(
  "catalog_product_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    reference: text("reference"),
    assetId: uuid("asset_id").references(() => catalogManagedAsset.id, {
      onDelete: "restrict",
    }),
    displayOrder: integer("display_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    isSocialImage: boolean("is_social_image").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_product_media_product_reference_unique").on(
      table.productId,
      table.reference,
    ),
    unique("catalog_product_media_asset_unique").on(table.assetId),
    unique("catalog_product_media_product_order_unique").on(
      table.productId,
      table.displayOrder,
    ),
    uniqueIndex("catalog_product_media_primary_idx")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
    uniqueIndex("catalog_product_media_social_idx")
      .on(table.productId)
      .where(sql`${table.isSocialImage} = true`),
    index("catalog_product_media_order_idx").on(
      table.productId,
      table.displayOrder,
      table.id,
    ),
    check(
      "catalog_product_media_reference_check",
      sql`${table.reference} IS NULL OR char_length(btrim(${table.reference})) BETWEEN 1 AND 2048`,
    ),
    check(
      "catalog_product_media_source_check",
      sql`(${table.reference} IS NOT NULL) <> (${table.assetId} IS NOT NULL)`,
    ),
    check(
      "catalog_product_media_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const catalogProductMediaTranslation = pgTable(
  "catalog_product_media_translation",
  {
    productMediaId: uuid("product_media_id")
      .notNull()
      .references(() => catalogProductMedia.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    altText: text("alt_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productMediaId, table.locale] }),
    check(
      "catalog_product_media_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_product_media_translation_alt_text_check",
      sql`char_length(btrim(${table.altText})) BETWEEN 1 AND 500`,
    ),
  ],
);
