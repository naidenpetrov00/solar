import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductMedia,
  catalogProductMediaTranslation,
  catalogProductSpecificationValue,
  catalogProductTranslation,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
  user,
} from "@/db/schema";

export type CatalogTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export type CatalogExecutor = typeof db | CatalogTransaction;

export async function getCatalogActorRole(
  executor: CatalogExecutor,
  actorId: string,
  lock = false,
) {
  const query = executor
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  const rows = lock ? await query.for("update") : await query;
  return rows[0]?.role ?? null;
}

export async function lockCatalogCategory(
  transaction: CatalogTransaction,
  categoryId: string,
) {
  const [category] = await transaction
    .select()
    .from(catalogCategory)
    .where(eq(catalogCategory.id, categoryId))
    .limit(1)
    .for("update");
  return category ?? null;
}

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

export async function getCategoryParentRows(
  executor: CatalogExecutor,
  categoryIds: string[],
) {
  if (categoryIds.length === 0) {
    return [];
  }

  return executor
    .select({
      id: catalogCategory.id,
      parentId: catalogCategory.parentId,
      status: catalogCategory.status,
    })
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, categoryIds));
}

export async function getCategoryPublicationAggregate(
  executor: CatalogExecutor,
  categoryId: string,
) {
  const [category] = await executor
    .select()
    .from(catalogCategory)
    .where(eq(catalogCategory.id, categoryId))
    .limit(1);

  if (!category) {
    return null;
  }

  const [translations, specifications] = await Promise.all([
    executor
      .select()
      .from(catalogCategoryTranslation)
      .where(eq(catalogCategoryTranslation.categoryId, categoryId)),
    executor
      .select()
      .from(catalogSpecification)
      .where(eq(catalogSpecification.categoryId, categoryId)),
  ]);
  const specificationIds = specifications.map(({ id }) => id);
  const specificationTranslations = specificationIds.length
    ? await executor
        .select()
        .from(catalogSpecificationTranslation)
        .where(
          inArray(
            catalogSpecificationTranslation.specificationId,
            specificationIds,
          ),
        )
    : [];
  const options = specificationIds.length
    ? await executor
        .select()
        .from(catalogSpecificationOption)
        .where(
          inArray(catalogSpecificationOption.specificationId, specificationIds),
        )
    : [];
  const optionIds = options.map(({ id }) => id);
  const optionTranslations = optionIds.length
    ? await executor
        .select()
        .from(catalogSpecificationOptionTranslation)
        .where(
          inArray(catalogSpecificationOptionTranslation.optionId, optionIds),
        )
    : [];
  const [parent] = category.parentId
    ? await executor
        .select({ id: catalogCategory.id, status: catalogCategory.status })
        .from(catalogCategory)
        .where(eq(catalogCategory.id, category.parentId))
        .limit(1)
    : [];

  return {
    category,
    parent: parent ?? null,
    translations,
    specifications,
    specificationTranslations,
    options,
    optionTranslations,
  };
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
