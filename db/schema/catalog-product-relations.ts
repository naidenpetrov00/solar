import { relations } from "drizzle-orm";
import { catalogCategory } from "@/db/schema/catalog-categories";
import {
  catalogSpecification,
  catalogSpecificationOption,
} from "@/db/schema/catalog-specifications";
import { catalogProduct } from "@/db/schema/catalog-products";
import { catalogProductTranslation } from "@/db/schema/catalog-product-translations";
import {
  catalogProductAdditionalCategory,
  catalogProductSpecificationValue,
} from "@/db/schema/catalog-product-details";
import {
  catalogProductMedia,
  catalogProductMediaTranslation,
} from "@/db/schema/catalog-product-media";
import { catalogManagedAsset, catalogProductDocument } from "@/db/schema/catalog-assets";
import { catalogPromotionProduct } from "@/db/schema/catalog-promotions";

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
    documents: many(catalogProductDocument),
    promotions: many(catalogPromotionProduct),
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
    asset: one(catalogManagedAsset, {
      fields: [catalogProductMedia.assetId],
      references: [catalogManagedAsset.id],
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
