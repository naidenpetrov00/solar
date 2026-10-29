import { sql } from "drizzle-orm";
import {
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
import { catalogProduct } from "@/db/schema/catalog-products";

export const catalogManagedAsset = pgTable(
  "catalog_managed_asset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    state: text("state").default("ready").notNull(),
    createdByActorId: text("created_by_actor_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_managed_asset_provider_key_unique").on(
      table.provider,
      table.objectKey,
    ),
    index("catalog_managed_asset_state_idx").on(table.state, table.updatedAt),
    check(
      "catalog_managed_asset_provider_check",
      sql`char_length(btrim(${table.provider})) BETWEEN 1 AND 80`,
    ),
    check(
      "catalog_managed_asset_key_check",
      sql`char_length(btrim(${table.objectKey})) BETWEEN 1 AND 1024`,
    ),
    check(
      "catalog_managed_asset_filename_check",
      sql`char_length(btrim(${table.originalFilename})) BETWEEN 1 AND 255`,
    ),
    check(
      "catalog_managed_asset_size_check",
      sql`${table.byteSize} BETWEEN 1 AND 20971520`,
    ),
    check(
      "catalog_managed_asset_state_check",
      sql`${table.state} IN ('ready', 'delete_pending')`,
    ),
    check(
      "catalog_managed_asset_dimensions_check",
      sql`(
        ${table.mimeType} IN ('image/jpeg', 'image/png', 'image/webp')
        AND ${table.width} > 0 AND ${table.height} > 0
      ) OR (
        ${table.mimeType} = 'application/pdf'
        AND ${table.width} IS NULL AND ${table.height} IS NULL
      )`,
    ),
  ],
);

export const catalogAssetUpload = pgTable(
  "catalog_asset_upload",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").notNull(),
    purpose: text("purpose").notNull(),
    productId: uuid("product_id").references(() => catalogProduct.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id").references(() => catalogCategory.id, {
      onDelete: "cascade",
    }),
    provider: text("provider").notNull(),
    temporaryKey: text("temporary_key").notNull(),
    finalKey: text("final_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    uploadFilename: text("upload_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    state: text("state").default("pending").notNull(),
    authorizationExpiresAt: timestamp("authorization_expires_at").notNull(),
    finalizationExpiresAt: timestamp("finalization_expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_asset_upload_temporary_key_unique").on(
      table.provider,
      table.temporaryKey,
    ),
    unique("catalog_asset_upload_final_key_unique").on(
      table.provider,
      table.finalKey,
    ),
    index("catalog_asset_upload_cleanup_idx").on(
      table.state,
      table.finalizationExpiresAt,
    ),
    index("catalog_asset_upload_product_idx").on(
      table.productId,
      table.purpose,
    ),
    index("catalog_asset_upload_category_idx").on(
      table.categoryId,
      table.purpose,
    ),
    check(
      "catalog_asset_upload_purpose_check",
      sql`${table.purpose} IN ('product_image', 'product_document', 'category_cover')`,
    ),
    check(
      "catalog_asset_upload_target_check",
      sql`(
        ${table.purpose} IN ('product_image', 'product_document')
        AND ${table.productId} IS NOT NULL AND ${table.categoryId} IS NULL
      ) OR (
        ${table.purpose} = 'category_cover'
        AND ${table.productId} IS NULL AND ${table.categoryId} IS NOT NULL
      )`,
    ),
    check(
      "catalog_asset_upload_state_check",
      sql`${table.state} IN ('pending', 'promoted', 'attached', 'failed')`,
    ),
    check(
      "catalog_asset_upload_size_check",
      sql`${table.byteSize} BETWEEN 1 AND 20971520`,
    ),
  ],
);

export const catalogProductDocument = pgTable(
  "catalog_product_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProduct.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => catalogManagedAsset.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("catalog_product_document_asset_unique").on(table.assetId),
    unique("catalog_product_document_order_unique").on(
      table.productId,
      table.displayOrder,
    ),
    index("catalog_product_document_product_idx").on(
      table.productId,
      table.displayOrder,
    ),
    check(
      "catalog_product_document_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const catalogProductDocumentTranslation = pgTable(
  "catalog_product_document_translation",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => catalogProductDocument.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.locale] }),
    check(
      "catalog_product_document_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_product_document_translation_title_check",
      sql`char_length(btrim(${table.title})) BETWEEN 1 AND 300`,
    ),
    check(
      "catalog_product_document_translation_description_check",
      sql`${table.description} IS NULL OR char_length(btrim(${table.description})) BETWEEN 1 AND 1000`,
    ),
  ],
);

export const catalogCategoryCover = pgTable(
  "catalog_category_cover",
  {
    categoryId: uuid("category_id")
      .primaryKey()
      .references(() => catalogCategory.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => catalogManagedAsset.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [unique("catalog_category_cover_asset_unique").on(table.assetId)],
);

export const catalogCategoryCoverTranslation = pgTable(
  "catalog_category_cover_translation",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategoryCover.categoryId, {
        onDelete: "cascade",
      }),
    locale: text("locale").notNull(),
    altText: text("alt_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.locale] }),
    check(
      "catalog_category_cover_translation_locale_check",
      sql`${table.locale} IN ('bg', 'en', 'tr', 'uk')`,
    ),
    check(
      "catalog_category_cover_translation_alt_check",
      sql`char_length(btrim(${table.altText})) BETWEEN 1 AND 500`,
    ),
  ],
);
