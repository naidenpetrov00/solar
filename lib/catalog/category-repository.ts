import "server-only";

import { eq, inArray } from "drizzle-orm";

import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import type {
  CatalogExecutor,
  CatalogTransaction,
} from "@/lib/catalog/actor-repository";

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
