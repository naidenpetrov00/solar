import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { catalogProduct } from "./catalog-products";
export const catalogProductTranslation = pgTable(
  "catalog_product_translation",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull(),
    fullDescription: text("full_description").notNull(),
    marketingLabel: text("marketing_label"),
    seoTitle: text("seo_title"),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    check(
      "catalog_product_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_product_translation_title_check",
      sql`char_length(btrim(${table.title})) <= 200`,
    ),
    check(
      "catalog_product_translation_short_description_check",
      sql`char_length(btrim(${table.shortDescription})) <= 2000`,
    ),
    check(
      "catalog_product_translation_full_description_check",
      sql`char_length(btrim(${table.fullDescription})) <= 50000`,
    ),
  ],
);
