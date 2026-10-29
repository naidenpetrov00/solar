import { relations } from "drizzle-orm";
import {
  catalogCategory,
  catalogCategoryTranslation,
} from "@/db/schema/catalog-categories";
import {
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema/catalog-specifications";
import { catalogProduct } from "@/db/schema/catalog-products";
import {
  catalogProductAdditionalCategory,
  catalogProductSpecificationValue,
} from "@/db/schema/catalog-product-details";
import { catalogCategoryCover } from "@/db/schema/catalog-assets";

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
    cover: one(catalogCategoryCover),
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
