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
  uuid,
} from "drizzle-orm/pg-core";
import { catalogCategory } from "@/db/schema/catalog-categories";

export const catalogSpecification = pgTable(
  "catalog_specification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategory.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    valueType: text("value_type").notNull(),
    unit: text("unit"),
    isRequired: boolean("is_required").default(false).notNull(),
    isFilterable: boolean("is_filterable").default(false).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_specification_category_key_unique").on(
      table.categoryId,
      table.key,
    ),
    unique("catalog_specification_id_category_unique").on(
      table.id,
      table.categoryId,
    ),
    index("catalog_specification_category_order_idx").on(
      table.categoryId,
      table.displayOrder,
      table.id,
    ),
    check(
      "catalog_specification_key_check",
      sql`char_length(${table.key}) BETWEEN 1 AND 80 AND ${table.key} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_specification_value_type_check",
      sql`${table.valueType} IN ('text', 'number', 'boolean', 'selection')`,
    ),
    check(
      "catalog_specification_unit_check",
      sql`${table.unit} IS NULL OR char_length(btrim(${table.unit})) BETWEEN 1 AND 40`,
    ),
    check(
      "catalog_specification_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const catalogSpecificationTranslation = pgTable(
  "catalog_specification_translation",
  {
    specificationId: uuid("specification_id")
      .notNull()
      .references(() => catalogSpecification.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.specificationId, table.locale] }),
    check(
      "catalog_specification_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_specification_translation_label_check",
      sql`char_length(btrim(${table.label})) BETWEEN 1 AND 200`,
    ),
  ],
);

export const catalogSpecificationOption = pgTable(
  "catalog_specification_option",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    specificationId: uuid("specification_id")
      .notNull()
      .references(() => catalogSpecification.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_specification_option_specification_code_unique").on(
      table.specificationId,
      table.code,
    ),
    unique("catalog_specification_option_id_specification_unique").on(
      table.id,
      table.specificationId,
    ),
    index("catalog_specification_option_order_idx").on(
      table.specificationId,
      table.displayOrder,
      table.id,
    ),
    check(
      "catalog_specification_option_code_check",
      sql`char_length(${table.code}) BETWEEN 1 AND 80 AND ${table.code} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_specification_option_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const catalogSpecificationOptionTranslation = pgTable(
  "catalog_specification_option_translation",
  {
    optionId: uuid("option_id")
      .notNull()
      .references(() => catalogSpecificationOption.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.optionId, table.locale] }),
    check(
      "catalog_specification_option_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_specification_option_translation_label_check",
      sql`char_length(btrim(${table.label})) BETWEEN 1 AND 200`,
    ),
  ],
);
