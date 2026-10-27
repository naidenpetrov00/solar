import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import {
  catalogCategory,
  catalogProductAdditionalCategory,
  catalogProductSpecificationValue,
} from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import type { CatalogProductSpecificationConfigurationInput } from "./catalog-inputs";
import type { lockCatalogProduct } from "./product-repository";
import { CatalogManagementError } from "./management-errors";
import { assertIdentifier } from "./management-access";
export async function assertProductCategories(
  transaction: CatalogTransaction,
  primaryCategoryId: string,
  additionalCategoryIds: string[],
  requirePublished: boolean,
  lock = false,
  extraCategoryIdsToLock: string[] = [],
) {
  const uniqueAdditional = [...new Set(additionalCategoryIds)];

  if (
    uniqueAdditional.length !== additionalCategoryIds.length ||
    uniqueAdditional.includes(primaryCategoryId)
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  const assignedIds = [primaryCategoryId, ...uniqueAdditional];
  const ids = lock
    ? [...new Set([...assignedIds, ...extraCategoryIdsToLock])].sort()
    : assignedIds;
  ids.forEach(assertIdentifier);
  const query = transaction
    .select({ id: catalogCategory.id, status: catalogCategory.status })
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, ids))
    .orderBy(asc(catalogCategory.id));
  const categories = lock ? await query.for("update") : await query;

  if (
    categories.length !== ids.length ||
    categories.some(({ status }) =>
      requirePublished ? status !== "published" : status === "archived",
    )
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}

export async function getProductAdditionalCategoryIds(
  transaction: CatalogTransaction,
  productId: string,
) {
  const rows = await transaction
    .select({ categoryId: catalogProductAdditionalCategory.categoryId })
    .from(catalogProductAdditionalCategory)
    .where(eq(catalogProductAdditionalCategory.productId, productId));
  return rows.map(({ categoryId }) => categoryId);
}

export async function assertProductCategoryChange(
  transaction: CatalogTransaction,
  product: NonNullable<Awaited<ReturnType<typeof lockCatalogProduct>>>,
  nextPrimaryCategoryId: string,
  discardSpecificationValues: boolean | undefined,
) {
  if (nextPrimaryCategoryId === product.primaryCategoryId) return;
  const [dependentValue] = await transaction
    .select({ productId: catalogProductSpecificationValue.productId })
    .from(catalogProductSpecificationValue)
    .where(eq(catalogProductSpecificationValue.productId, product.id))
    .limit(1);
  const currentConfiguration =
    product.specificationConfiguration as CatalogProductSpecificationConfigurationInput;
  if (
    (dependentValue ||
      currentConfiguration.excludedSpecificationIds.length > 0 ||
      currentConfiguration.customSpecifications.length > 0) &&
    !discardSpecificationValues
  ) {
    throw new CatalogManagementError("DEPENDENCY_EXISTS");
  }
}
