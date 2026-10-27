import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const catalogCategory = pgTable(
  "catalog_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id"),
    bgSlug: text("bg_slug").notNull(),
    enSlug: text("en_slug").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default("draft").notNull(),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "catalog_category_parent_id_catalog_category_id_fk",
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete("restrict"),
    uniqueIndex("catalog_category_root_bg_slug_idx")
      .on(table.bgSlug)
      .where(sql`${table.parentId} IS NULL`),
    uniqueIndex("catalog_category_sibling_bg_slug_idx")
      .on(table.parentId, table.bgSlug)
      .where(sql`${table.parentId} IS NOT NULL`),
    uniqueIndex("catalog_category_root_en_slug_idx")
      .on(table.enSlug)
      .where(sql`${table.parentId} IS NULL`),
    uniqueIndex("catalog_category_sibling_en_slug_idx")
      .on(table.parentId, table.enSlug)
      .where(sql`${table.parentId} IS NOT NULL`),
    index("catalog_category_parent_order_idx").on(
      table.parentId,
      table.sortOrder,
      table.id,
    ),
    index("catalog_category_status_parent_idx").on(
      table.status,
      table.parentId,
      table.sortOrder,
    ),
    check(
      "catalog_category_bg_slug_check",
      sql`char_length(${table.bgSlug}) BETWEEN 1 AND 120 AND ${table.bgSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_category_en_slug_check",
      sql`char_length(${table.enSlug}) BETWEEN 1 AND 120 AND ${table.enSlug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check("catalog_category_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "catalog_category_status_check",
      sql`${table.status} IN ('draft', 'published', 'archived')`,
    ),
    check(
      "catalog_category_self_parent_check",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),
    check(
      "catalog_category_publication_timestamp_check",
      sql`${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL`,
    ),
    check(
      "catalog_category_archival_timestamp_check",
      sql`(${table.status} = 'archived' AND ${table.archivedAt} IS NOT NULL) OR (${table.status} <> 'archived' AND ${table.archivedAt} IS NULL)`,
    ),
  ],
);

export const catalogCategoryTranslation = pgTable(
  "catalog_category_translation",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategory.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    introduction: text("introduction").notNull(),
    detailedContent: text("detailed_content"),
    seoTitle: text("seo_title"),
    metaDescription: text("meta_description"),
    productTitleGuidance: text("product_title_guidance"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.locale] }),
    index("catalog_category_translation_locale_name_idx").on(
      table.locale,
      table.name,
      table.categoryId,
    ),
    check(
      "catalog_category_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_category_translation_name_check",
      sql`char_length(btrim(${table.name})) BETWEEN 1 AND 200`,
    ),
    check(
      "catalog_category_translation_introduction_check",
      sql`char_length(btrim(${table.introduction})) BETWEEN 1 AND 2000`,
    ),
  ],
);
