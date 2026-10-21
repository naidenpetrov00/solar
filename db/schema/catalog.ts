import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
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
    vatRateBasisPoints: integer("vat_rate_basis_points").default(2000).notNull(),
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
      foreignColumns: [catalogSpecification.id, catalogSpecification.categoryId],
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

export const catalogProductMedia = pgTable(
  "catalog_product_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
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
      sql`char_length(btrim(${table.reference})) BETWEEN 1 AND 2048`,
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

export const catalogCategoryRelations = relations(
  catalogCategory,
  ({ one, many }) => ({
    parent: one(catalogCategory, {
      fields: [catalogCategory.parentId],
      references: [catalogCategory.id],
      relationName: "catalogCategoryTree",
    }),
    children: many(catalogCategory, { relationName: "catalogCategoryTree" }),
    translations: many(catalogCategoryTranslation),
    specifications: many(catalogSpecification),
    primaryProducts: many(catalogProduct),
    additionalProducts: many(catalogProductAdditionalCategory),
  }),
);

export const catalogCategoryTranslationRelations = relations(
  catalogCategoryTranslation,
  ({ one }) => ({
    category: one(catalogCategory, {
      fields: [catalogCategoryTranslation.categoryId],
      references: [catalogCategory.id],
    }),
  }),
);

export const catalogSpecificationRelations = relations(
  catalogSpecification,
  ({ one, many }) => ({
    category: one(catalogCategory, {
      fields: [catalogSpecification.categoryId],
      references: [catalogCategory.id],
    }),
    translations: many(catalogSpecificationTranslation),
    options: many(catalogSpecificationOption),
    productValues: many(catalogProductSpecificationValue),
  }),
);

export const catalogSpecificationTranslationRelations = relations(
  catalogSpecificationTranslation,
  ({ one }) => ({
    specification: one(catalogSpecification, {
      fields: [catalogSpecificationTranslation.specificationId],
      references: [catalogSpecification.id],
    }),
  }),
);

export const catalogSpecificationOptionRelations = relations(
  catalogSpecificationOption,
  ({ one, many }) => ({
    specification: one(catalogSpecification, {
      fields: [catalogSpecificationOption.specificationId],
      references: [catalogSpecification.id],
    }),
    translations: many(catalogSpecificationOptionTranslation),
    productValues: many(catalogProductSpecificationValue),
  }),
);

export const catalogSpecificationOptionTranslationRelations = relations(
  catalogSpecificationOptionTranslation,
  ({ one }) => ({
    option: one(catalogSpecificationOption, {
      fields: [catalogSpecificationOptionTranslation.optionId],
      references: [catalogSpecificationOption.id],
    }),
  }),
);

export const catalogProductRelations = relations(
  catalogProduct,
  ({ one, many }) => ({
    primaryCategory: one(catalogCategory, {
      fields: [catalogProduct.primaryCategoryId],
      references: [catalogCategory.id],
    }),
    translations: many(catalogProductTranslation),
    additionalCategories: many(catalogProductAdditionalCategory),
    specificationValues: many(catalogProductSpecificationValue),
    media: many(catalogProductMedia),
  }),
);

export const catalogProductTranslationRelations = relations(
  catalogProductTranslation,
  ({ one }) => ({
    product: one(catalogProduct, {
      fields: [catalogProductTranslation.productId],
      references: [catalogProduct.id],
    }),
  }),
);

export const catalogProductAdditionalCategoryRelations = relations(
  catalogProductAdditionalCategory,
  ({ one }) => ({
    product: one(catalogProduct, {
      fields: [catalogProductAdditionalCategory.productId],
      references: [catalogProduct.id],
    }),
    category: one(catalogCategory, {
      fields: [catalogProductAdditionalCategory.categoryId],
      references: [catalogCategory.id],
    }),
  }),
);

export const catalogProductSpecificationValueRelations = relations(
  catalogProductSpecificationValue,
  ({ one }) => ({
    product: one(catalogProduct, {
      fields: [catalogProductSpecificationValue.productId],
      references: [catalogProduct.id],
    }),
    specification: one(catalogSpecification, {
      fields: [catalogProductSpecificationValue.specificationId],
      references: [catalogSpecification.id],
    }),
    selectionOption: one(catalogSpecificationOption, {
      fields: [catalogProductSpecificationValue.selectionOptionId],
      references: [catalogSpecificationOption.id],
    }),
  }),
);

export const catalogProductMediaRelations = relations(
  catalogProductMedia,
  ({ one, many }) => ({
    product: one(catalogProduct, {
      fields: [catalogProductMedia.productId],
      references: [catalogProduct.id],
    }),
    translations: many(catalogProductMediaTranslation),
  }),
);

export const catalogProductMediaTranslationRelations = relations(
  catalogProductMediaTranslation,
  ({ one }) => ({
    media: one(catalogProductMedia, {
      fields: [catalogProductMediaTranslation.productMediaId],
      references: [catalogProductMedia.id],
    }),
  }),
);
