import { relations } from "drizzle-orm";
import {
  catalogCategoryCover,
  catalogCategoryCoverTranslation,
  catalogAssetUpload,
  catalogManagedAsset,
  catalogProductDocument,
  catalogProductDocumentTranslation,
} from "@/db/schema/catalog-assets";
import { catalogCategory } from "@/db/schema/catalog-categories";
import { catalogProduct } from "@/db/schema/catalog-products";
import { catalogProductMedia } from "@/db/schema/catalog-product-media";

export const catalogManagedAssetRelations = relations(
  catalogManagedAsset,
  ({ one }) => ({
    productMedia: one(catalogProductMedia, {
      fields: [catalogManagedAsset.id],
      references: [catalogProductMedia.assetId],
    }),
    document: one(catalogProductDocument, {
      fields: [catalogManagedAsset.id],
      references: [catalogProductDocument.assetId],
    }),
    categoryCover: one(catalogCategoryCover, {
      fields: [catalogManagedAsset.id],
      references: [catalogCategoryCover.assetId],
    }),
  }),
);

export const catalogAssetUploadRelations = relations(
  catalogAssetUpload,
  ({ one }) => ({
    product: one(catalogProduct, {
      fields: [catalogAssetUpload.productId],
      references: [catalogProduct.id],
    }),
    category: one(catalogCategory, {
      fields: [catalogAssetUpload.categoryId],
      references: [catalogCategory.id],
    }),
  }),
);

export const catalogProductDocumentRelations = relations(
  catalogProductDocument,
  ({ one, many }) => ({
    product: one(catalogProduct, {
      fields: [catalogProductDocument.productId],
      references: [catalogProduct.id],
    }),
    asset: one(catalogManagedAsset, {
      fields: [catalogProductDocument.assetId],
      references: [catalogManagedAsset.id],
    }),
    translations: many(catalogProductDocumentTranslation),
  }),
);

export const catalogProductDocumentTranslationRelations = relations(
  catalogProductDocumentTranslation,
  ({ one }) => ({
    document: one(catalogProductDocument, {
      fields: [catalogProductDocumentTranslation.documentId],
      references: [catalogProductDocument.id],
    }),
  }),
);

export const catalogCategoryCoverRelations = relations(
  catalogCategoryCover,
  ({ one, many }) => ({
    category: one(catalogCategory, {
      fields: [catalogCategoryCover.categoryId],
      references: [catalogCategory.id],
    }),
    asset: one(catalogManagedAsset, {
      fields: [catalogCategoryCover.assetId],
      references: [catalogManagedAsset.id],
    }),
    translations: many(catalogCategoryCoverTranslation),
  }),
);

export const catalogCategoryCoverTranslationRelations = relations(
  catalogCategoryCoverTranslation,
  ({ one }) => ({
    cover: one(catalogCategoryCover, {
      fields: [catalogCategoryCoverTranslation.categoryId],
      references: [catalogCategoryCover.categoryId],
    }),
  }),
);
