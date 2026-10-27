import "server-only";

import { eq, inArray } from "drizzle-orm";

import {
  catalogCategory,
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductMedia,
  catalogProductMediaTranslation,
  catalogProductSpecificationValue,
  catalogProductTranslation,
  catalogSpecification,
  catalogSpecificationOption,
} from "@/db/schema";
import type {
  CatalogExecutor,
  CatalogTransaction,
} from "@/lib/catalog/actor-repository";

export async function lockCatalogProduct(
  transaction: CatalogTransaction,
  productId: string,
) {
  const [product] = await transaction
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, productId))
    .limit(1)
    .for("update");
  return product ?? null;
}

export async function getProductPublicationAggregate(
  executor: CatalogExecutor,
  productId: string,
) {
  const [product] = await executor
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, productId))
    .limit(1);

  if (!product) {
    return null;
  }

  const [translations, additionalCategories, specificationValues, media] =
    await Promise.all([
      executor
        .select({
          productId: catalogProductTranslation.productId,
          locale: catalogProductTranslation.locale,
          title: catalogProductTranslation.title,
          shortDescription: catalogProductTranslation.shortDescription,
          fullDescription: catalogProductTranslation.fullDescription,
          marketingLabel: catalogProductTranslation.marketingLabel,
          seoTitle: catalogProductTranslation.seoTitle,
          metaDescription: catalogProductTranslation.metaDescription,
        })
        .from(catalogProductTranslation)
        .where(eq(catalogProductTranslation.productId, productId)),
      executor
        .select()
        .from(catalogProductAdditionalCategory)
        .where(eq(catalogProductAdditionalCategory.productId, productId)),
      executor
        .select()
        .from(catalogProductSpecificationValue)
        .where(eq(catalogProductSpecificationValue.productId, productId)),
      executor
        .select()
        .from(catalogProductMedia)
        .where(eq(catalogProductMedia.productId, productId)),
    ]);
  const categoryIds = [
    product.primaryCategoryId,
    ...additionalCategories.map(({ categoryId }) => categoryId),
  ];
  const categories = await executor
    .select({ id: catalogCategory.id, status: catalogCategory.status })
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, categoryIds));
  const specifications = await executor
    .select()
    .from(catalogSpecification)
    .where(eq(catalogSpecification.categoryId, product.primaryCategoryId));
  const optionIds = specificationValues.flatMap(({ selectionOptionId }) =>
    selectionOptionId ? [selectionOptionId] : [],
  );
  const selectedOptions = optionIds.length
    ? await executor
        .select({
          id: catalogSpecificationOption.id,
          specificationId: catalogSpecificationOption.specificationId,
        })
        .from(catalogSpecificationOption)
        .where(inArray(catalogSpecificationOption.id, optionIds))
    : [];
  const mediaIds = media.map(({ id }) => id);
  const mediaTranslations = mediaIds.length
    ? await executor
        .select()
        .from(catalogProductMediaTranslation)
        .where(inArray(catalogProductMediaTranslation.productMediaId, mediaIds))
    : [];

  return {
    product,
    translations,
    additionalCategories,
    categories,
    specifications,
    specificationValues,
    selectedOptions,
    media,
    mediaTranslations,
  };
}
