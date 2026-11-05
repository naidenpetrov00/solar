import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import { type CatalogTransaction } from "@/lib/catalog/actor-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { normalizeCategoryTranslations } from "@/lib/catalog/management-category-input";
import { type PersistedNormalizedCatalogSpecification } from "@/lib/catalog/management-category-specifications";

export async function insertCategoryTranslations(
  transaction: CatalogTransaction,
  categoryId: string,
  translations: ReturnType<typeof normalizeCategoryTranslations>,
) {
  if (translations.length === 0) return;
  await transaction
    .insert(catalogCategoryTranslation)
    .values(
      translations.map((translation) => ({ categoryId, ...translation })),
    );
}

export async function insertCategorySpecifications(
  transaction: CatalogTransaction,
  categoryId: string,
  specifications: PersistedNormalizedCatalogSpecification[],
) {
  for (const specification of specifications) {
    const specificationId = specification.id ?? randomUUID();
    await transaction.insert(catalogSpecification).values({
      id: specificationId,
      categoryId,
      key: specification.key,
      valueType: specification.valueType,
      unit: specification.unit,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specification.displayOrder,
    });

    if (specification.translations.length > 0) {
      await transaction.insert(catalogSpecificationTranslation).values(
        specification.translations.map((translation) => ({
          specificationId,
          ...translation,
        })),
      );
    }

    for (const option of specification.options) {
      const optionId = option.id ?? randomUUID();
      await transaction.insert(catalogSpecificationOption).values({
        id: optionId,
        specificationId,
        code: option.code,
        displayOrder: option.displayOrder,
      });

      if (option.translations.length > 0) {
        await transaction.insert(catalogSpecificationOptionTranslation).values(
          option.translations.map((translation) => ({
            optionId,
            ...translation,
          })),
        );
      }
    }
  }
}

export async function assertCategoryExists(
  transaction: CatalogTransaction,
  categoryId: string,
  lock = false,
) {
  const query = transaction
    .select({ id: catalogCategory.id, status: catalogCategory.status })
    .from(catalogCategory)
    .where(eq(catalogCategory.id, categoryId))
    .limit(1);
  const [category] = lock ? await query.for("update") : await query;

  if (!category || category.status === "archived") {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  return category;
}
