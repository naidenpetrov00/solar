import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import { isCatalogLocale } from "@/lib/catalog/model";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { catalogSpecificationValueType } from "@/lib/catalog/management-access";
import type { ManagedCatalogProductWorkspace } from "@/lib/catalog/management-product-types";

export async function getProductCategoryConfigurations(
  categoryId: string,
): Promise<ManagedCatalogProductWorkspace["categoryConfigurations"]> {
  const [categoryRows, categoryTranslationRows, categorySpecificationRows] =
    await Promise.all([
      db.select({ id: catalogCategory.id }).from(catalogCategory),
      db
        .select({
          categoryId: catalogCategoryTranslation.categoryId,
          locale: catalogCategoryTranslation.locale,
          productTitleGuidance: catalogCategoryTranslation.productTitleGuidance,
        })
        .from(catalogCategoryTranslation),
      db.select().from(catalogSpecification),
    ]);

  if (!categoryRows.some(({ id }) => id === categoryId)) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const specificationIds = categorySpecificationRows.map(({ id }) => id);
  const [specificationTranslationRows, specificationOptionRows] =
    specificationIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(catalogSpecificationTranslation)
            .where(
              inArray(
                catalogSpecificationTranslation.specificationId,
                specificationIds,
              ),
            ),
          db
            .select()
            .from(catalogSpecificationOption)
            .where(
              inArray(
                catalogSpecificationOption.specificationId,
                specificationIds,
              ),
            ),
        ])
      : [[], []];
  const optionIds = specificationOptionRows.map(({ id }) => id);
  const optionTranslationRows =
    optionIds.length > 0
      ? await db
          .select()
          .from(catalogSpecificationOptionTranslation)
          .where(
            inArray(catalogSpecificationOptionTranslation.optionId, optionIds),
          )
      : [];
  const categoryConfigurations = categoryRows.map(
    ({ id: configuredCategoryId }) => ({
      categoryId: configuredCategoryId,
      titleGuidance: categoryTranslationRows.flatMap((translation) =>
        translation.categoryId === configuredCategoryId &&
        isCatalogLocale(translation.locale)
          ? [
              {
                locale: translation.locale,
                value: translation.productTitleGuidance,
              },
            ]
          : [],
      ),
      specifications: categorySpecificationRows
        .filter(
          ({ categoryId: specificationCategoryId }) =>
            specificationCategoryId === configuredCategoryId,
        )
        .toSorted(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.id.localeCompare(right.id),
        )
        .map((specification) => ({
          id: specification.id,
          key: specification.key,
          valueType: catalogSpecificationValueType(specification.valueType),
          unit: specification.unit,
          isRequired: specification.isRequired,
          isFilterable: specification.isFilterable,
          displayOrder: specification.displayOrder,
          translations: specificationTranslationRows.flatMap((translation) =>
            translation.specificationId === specification.id &&
            isCatalogLocale(translation.locale)
              ? [{ locale: translation.locale, label: translation.label }]
              : [],
          ),
          options: specificationOptionRows
            .filter(
              ({ specificationId }) => specificationId === specification.id,
            )
            .toSorted(
              (left, right) =>
                left.displayOrder - right.displayOrder ||
                left.id.localeCompare(right.id),
            )
            .map((option) => ({
              id: option.id,
              code: option.code,
              displayOrder: option.displayOrder,
              translations: optionTranslationRows.flatMap((translation) =>
                translation.optionId === option.id &&
                isCatalogLocale(translation.locale)
                  ? [{ locale: translation.locale, label: translation.label }]
                  : [],
              ),
            })),
        })),
    }),
  );

  return categoryConfigurations;
}
