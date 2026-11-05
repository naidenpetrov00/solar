import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import {
  catalogProduct,
  catalogProductSpecificationValue,
} from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import type { CatalogProductSpecificationConfigurationInput } from "./catalog-inputs";
import { CatalogManagementError } from "./management-errors";
import type { PersistedNormalizedCatalogSpecification } from "./management-category-specifications";

type ExistingSpecification = { id: string; valueType: string };
type ExistingOption = { id: string; specificationId: string };

export async function assertSpecificationChangesAllowed(
  transaction: CatalogTransaction,
  category: { id: string; status: string },
  existingSpecifications: ExistingSpecification[],
  existingOptions: ExistingOption[],
  specifications: PersistedNormalizedCatalogSpecification[],
) {
  const existingIds = existingSpecifications.map(({ id }) => id);
  const values = existingIds.length
    ? await transaction
        .select({
          productId: catalogProductSpecificationValue.productId,
          specificationId: catalogProductSpecificationValue.specificationId,
          selectionOptionId:
            catalogProductSpecificationValue.selectionOptionId,
        })
        .from(catalogProductSpecificationValue)
        .where(
          inArray(catalogProductSpecificationValue.specificationId, existingIds),
        )
    : [];
  const valuedSpecificationIds = new Set(
    values.map(({ specificationId }) => specificationId),
  );
  const selectedOptionIds = new Set(
    values.flatMap(({ selectionOptionId }) =>
      selectionOptionId ? [selectionOptionId] : [],
    ),
  );
  const nextById = new Map(
    specifications.flatMap((specification) =>
      specification.id ? [[specification.id, specification] as const] : [],
    ),
  );

  for (const existing of existingSpecifications) {
    const next = nextById.get(existing.id);
    if (
      valuedSpecificationIds.has(existing.id) &&
      (!next || next.valueType !== existing.valueType)
    ) {
      throw new CatalogManagementError("DEPENDENCY_EXISTS");
    }
  }

  for (const option of existingOptions) {
    const next = nextById.get(option.specificationId);
    if (
      selectedOptionIds.has(option.id) &&
      !next?.options.some(({ id }) => id === option.id)
    ) {
      throw new CatalogManagementError("DEPENDENCY_EXISTS");
    }
  }

  if (category.status !== "published") return;
  const requiredIds = specifications.flatMap((specification) =>
    specification.id && specification.isRequired ? [specification.id] : [],
  );
  const publishedProducts = await transaction
    .select({
      id: catalogProduct.id,
      specificationConfiguration: catalogProduct.specificationConfiguration,
    })
    .from(catalogProduct)
    .where(
      and(
        eq(catalogProduct.primaryCategoryId, category.id),
        eq(catalogProduct.status, "published"),
      ),
    );
  if (publishedProducts.length === 0) return;
  if (
    specifications.some(
      (specification) => !specification.id && specification.isRequired,
    )
  ) {
    throw new CatalogManagementError("PUBLICATION_INVALID");
  }

  const productIds = publishedProducts.map(({ id }) => id);
  const requiredValues = requiredIds.length
    ? await transaction
        .select({
          productId: catalogProductSpecificationValue.productId,
          specificationId: catalogProductSpecificationValue.specificationId,
        })
        .from(catalogProductSpecificationValue)
        .where(
          and(
            inArray(catalogProductSpecificationValue.productId, productIds),
            inArray(
              catalogProductSpecificationValue.specificationId,
              requiredIds,
            ),
          ),
        )
    : [];
  const populated = new Set(
    requiredValues.map(
      ({ productId, specificationId }) => `${productId}:${specificationId}`,
    ),
  );

  for (const product of publishedProducts) {
    const configuration =
      product.specificationConfiguration as CatalogProductSpecificationConfigurationInput;
    if (
      requiredIds.some(
        (specificationId) =>
          configuration.excludedSpecificationIds.includes(specificationId) ||
          !populated.has(`${product.id}:${specificationId}`),
      )
    ) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }
  }
}
