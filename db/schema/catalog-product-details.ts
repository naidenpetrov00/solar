import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { catalogCategory } from "@/db/schema/catalog-categories";
import { catalogProduct } from "@/db/schema/catalog-products";
import {
  catalogSpecification,
  catalogSpecificationOption,
} from "@/db/schema/catalog-specifications";

export const catalogProductAdditionalCategory = pgTable(
  "catalog_product_additional_category",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategory.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("catalog_product_additional_category_category_idx").on(
      table.categoryId,
      table.productId,
    ),
  ],
);

export const catalogProductSpecificationValue = pgTable(
  "catalog_product_specification_value",
  {
    productId: uuid("product_id").notNull(),
    primaryCategoryId: uuid("primary_category_id").notNull(),
    specificationId: uuid("specification_id").notNull(),
    textValue: text("text_value"),
    numberValue: numeric("number_value", { precision: 20, scale: 6 }),
    booleanValue: boolean("boolean_value"),
    selectionOptionId: uuid("selection_option_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.specificationId] }),
    foreignKey({
      name: "catalog_product_specification_value_product_category_fk",
      columns: [table.productId, table.primaryCategoryId],
      foreignColumns: [catalogProduct.id, catalogProduct.primaryCategoryId],
    }).onDelete("cascade"),
    foreignKey({
      name: "catalog_product_specification_value_specification_category_fk",
      columns: [table.specificationId, table.primaryCategoryId],
      foreignColumns: [
        catalogSpecification.id,
        catalogSpecification.categoryId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "catalog_product_specification_value_option_specification_fk",
      columns: [table.selectionOptionId, table.specificationId],
      foreignColumns: [
        catalogSpecificationOption.id,
        catalogSpecificationOption.specificationId,
      ],
    }).onDelete("restrict"),
    index("catalog_product_specification_value_specification_idx").on(
      table.specificationId,
      table.productId,
    ),
    check(
      "catalog_product_specification_value_single_value_check",
      sql`num_nonnulls(${table.textValue}, ${table.numberValue}, ${table.booleanValue}, ${table.selectionOptionId}) = 1`,
    ),
    check(
      "catalog_product_specification_value_text_check",
      sql`${table.textValue} IS NULL OR char_length(btrim(${table.textValue})) BETWEEN 1 AND 5000`,
    ),
  ],
);
