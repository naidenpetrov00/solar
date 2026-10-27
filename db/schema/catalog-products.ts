import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { catalogCategory } from "@/db/schema/catalog-categories";

export const catalogProduct = pgTable(
  "catalog_product",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skuNumber: bigint("sku_number", { mode: "bigint" })
      .generatedAlwaysAsIdentity({ startWith: 1 })
      .notNull(),
    sku: text("sku")
      .notNull()
      .generatedAlwaysAs(
        sql`'PRD-' || lpad("sku_number"::text, greatest(6, length("sku_number"::text)), '0')`,
      ),
    brand: text("brand"),
    bgSlug: text("bg_slug").notNull(),
    enSlug: text("en_slug").notNull(),
    trSlug: text("tr_slug"),
    ukSlug: text("uk_slug"),
    salesMode: text("sales_mode").notNull(),
    primaryCategoryId: uuid("primary_category_id")
      .notNull()
      .references(() => catalogCategory.id, { onDelete: "restrict" }),
    status: text("status").default("draft").notNull(),
    availability: text("availability"),
    gtin: text("gtin"),
    mpn: text("mpn"),
    specificationConfiguration: jsonb("specification_configuration")
      .$type<{
        excludedSpecificationIds: string[];
        customSpecifications: unknown[];
      }>()
      .default({ excludedSpecificationIds: [], customSpecifications: [] })
      .notNull(),
    currency: text("currency").default("EUR").notNull(),
    vatRateBasisPoints: integer("vat_rate_basis_points")
      .default(2000)
      .notNull(),
    pricePresentation: text("price_presentation").notNull(),
    priceEntryBasis: text("price_entry_basis"),
    priceInputMinor: bigint("price_input_minor", { mode: "bigint" }),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_product_id_primary_category_unique").on(
      table.id,
      table.primaryCategoryId,
    ),
    uniqueIndex("catalog_product_sku_idx").on(table.sku),
    uniqueIndex("catalog_product_bg_slug_idx").on(table.bgSlug),
    uniqueIndex("catalog_product_en_slug_idx").on(table.enSlug),
    uniqueIndex("catalog_product_tr_effective_slug_idx").on(
      sql`coalesce(${table.trSlug}, ${table.enSlug})`,
    ),
    uniqueIndex("catalog_product_uk_effective_slug_idx").on(
      sql`coalesce(${table.ukSlug}, ${table.enSlug})`,
    ),
    uniqueIndex("catalog_product_gtin_idx")
      .on(table.gtin)
      .where(sql`${table.gtin} IS NOT NULL`),
    index("catalog_product_status_category_idx").on(
      table.status,
      table.primaryCategoryId,
      table.id,
    ),
    index("catalog_product_primary_category_idx").on(
      table.primaryCategoryId,
      table.id,
    ),
    check(
      "catalog_product_brand_check",
      sql`${table.brand} IS NULL OR (${table.brand} = btrim(${table.brand}) AND char_length(${table.brand}) BETWEEN 1 AND 120)`,
    ),
    check(
      "catalog_product_bg_slug_check",
      sql`char_length(${table.bgSlug}) BETWEEN 1 AND 120 AND ${table.bgSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_product_en_slug_check",
      sql`char_length(${table.enSlug}) BETWEEN 1 AND 120 AND ${table.enSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_product_tr_slug_check",
      sql`${table.trSlug} IS NULL OR (char_length(${table.trSlug}) BETWEEN 1 AND 120 AND ${table.trSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')`,
    ),
    check(
      "catalog_product_uk_slug_check",
      sql`${table.ukSlug} IS NULL OR (char_length(${table.ukSlug}) BETWEEN 1 AND 120 AND ${table.ukSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')`,
    ),
    check(
      "catalog_product_sales_mode_check",
      sql`${table.salesMode} IN ('direct_purchase', 'enquiry')`,
    ),
    check(
      "catalog_product_status_check",
      sql`${table.status} IN ('draft', 'published', 'archived')`,
    ),
    check(
      "catalog_product_gtin_check",
      sql`${table.gtin} IS NULL OR ${table.gtin} ~ '^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$'`,
    ),
    check(
      "catalog_product_mpn_check",
      sql`${table.mpn} IS NULL OR (${table.mpn} = btrim(${table.mpn}) AND char_length(${table.mpn}) BETWEEN 1 AND 100)`,
    ),
    check("catalog_product_currency_check", sql`${table.currency} = 'EUR'`),
    check(
      "catalog_product_vat_rate_check",
      sql`${table.vatRateBasisPoints} = 2000`,
    ),
    check(
      "catalog_product_commerce_check",
      sql`(
        ${table.salesMode} = 'direct_purchase'
        AND ${table.availability} IN ('in_stock', 'out_of_stock')
        AND ${table.pricePresentation} = 'exact'
        AND ${table.priceEntryBasis} IN ('vat_inclusive', 'vat_exclusive')
        AND ${table.priceInputMinor} > 0
      ) OR (
        ${table.salesMode} = 'enquiry'
        AND ${table.availability} IS NULL
        AND (
          (${table.pricePresentation} IN ('exact', 'from')
            AND ${table.priceEntryBasis} IN ('vat_inclusive', 'vat_exclusive')
            AND ${table.priceInputMinor} > 0)
          OR
          (${table.pricePresentation} = 'on_request'
            AND ${table.priceEntryBasis} IS NULL
            AND ${table.priceInputMinor} IS NULL)
        )
      )`,
    ),
    check(
      "catalog_product_publication_timestamp_check",
      sql`${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL`,
    ),
    check(
      "catalog_product_archival_timestamp_check",
      sql`(${table.status} = 'archived' AND ${table.archivedAt} IS NOT NULL) OR (${table.status} <> 'archived' AND ${table.archivedAt} IS NULL)`,
    ),
  ],
);
