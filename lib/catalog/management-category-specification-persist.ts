import "server-only";

import { eq, inArray } from "drizzle-orm";
import {
  catalogProduct,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import type { CatalogProductSpecificationConfigurationInput } from "./catalog-inputs";
import { insertCategorySpecifications } from "./management-category-data";
import { persistCategorySpecificationOptions } from "./management-category-specification-option-persist";
import type { PersistedNormalizedCatalogSpecification } from "./management-category-specifications";

type ExistingOption = { id: string; specificationId: string };

async function replaceTranslations(
  transaction: CatalogTransaction,
  specification: PersistedNormalizedCatalogSpecification,
) {
  const specificationId = specification.id!;
  await transaction
    .delete(catalogSpecificationTranslation)
    .where(eq(catalogSpecificationTranslation.specificationId, specificationId));
  await transaction.insert(catalogSpecificationTranslation).values(
    specification.translations.map((translation) => ({
      specificationId,
      ...translation,
    })),
  );
}

export async function persistCategorySpecifications(
  transaction: CatalogTransaction,
  categoryId: string,
  existingSpecificationIds: string[],
  existingOptions: ExistingOption[],
  specifications: PersistedNormalizedCatalogSpecification[],
) {
  const retainedIds = new Set(
    specifications.flatMap(({ id }) => (id ? [id] : [])),
  );
  const removedIds = existingSpecificationIds.filter(
    (id) => !retainedIds.has(id),
  );
  if (removedIds.length) {
    const products = await transaction
      .select({
        id: catalogProduct.id,
        specificationConfiguration: catalogProduct.specificationConfiguration,
      })
      .from(catalogProduct)
      .where(eq(catalogProduct.primaryCategoryId, categoryId));
    for (const product of products) {
      const configuration =
        product.specificationConfiguration as CatalogProductSpecificationConfigurationInput;
      const excludedSpecificationIds =
        configuration.excludedSpecificationIds.filter(
          (id) => !removedIds.includes(id),
        );
      if (
        excludedSpecificationIds.length !==
        configuration.excludedSpecificationIds.length
      ) {
        await transaction
          .update(catalogProduct)
          .set({
            specificationConfiguration: {
              excludedSpecificationIds,
              customSpecifications: [],
            },
          })
          .where(eq(catalogProduct.id, product.id));
      }
    }
    const removedOptionIds = existingOptions.flatMap((option) =>
      removedIds.includes(option.specificationId) ? [option.id] : [],
    );
    if (removedOptionIds.length) {
      await transaction
        .delete(catalogSpecificationOptionTranslation)
        .where(
          inArray(
            catalogSpecificationOptionTranslation.optionId,
            removedOptionIds,
          ),
        );
      await transaction
        .delete(catalogSpecificationOption)
        .where(inArray(catalogSpecificationOption.id, removedOptionIds));
    }
    await transaction
      .delete(catalogSpecificationTranslation)
      .where(
        inArray(catalogSpecificationTranslation.specificationId, removedIds),
      );
    await transaction
      .delete(catalogSpecification)
      .where(inArray(catalogSpecification.id, removedIds));
  }

  for (const specification of specifications) {
    if (!specification.id) continue;
    await transaction
      .update(catalogSpecification)
      .set({
        valueType: specification.valueType,
        unit: specification.unit,
        isRequired: specification.isRequired,
        isFilterable: specification.isFilterable,
        displayOrder: specification.displayOrder,
      })
      .where(eq(catalogSpecification.id, specification.id));
    await replaceTranslations(transaction, specification);
    await persistCategorySpecificationOptions(
      transaction,
      specification,
      existingOptions,
    );
  }

  await insertCategorySpecifications(
    transaction,
    categoryId,
    specifications.filter((specification) => !specification.id),
  );
}
