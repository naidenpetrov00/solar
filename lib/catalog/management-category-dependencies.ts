import "server-only";
import { and, eq, inArray, ne, or } from "drizzle-orm";
import {
  catalogCategory,
  catalogProduct,
  catalogProductAdditionalCategory,
} from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import { CatalogManagementError } from "./management-errors";
export async function assertCategoryCanUnpublish(
  transaction: CatalogTransaction,
  categoryId: string,
) {
  const [publishedChild] = await transaction
    .select({ id: catalogCategory.id })
    .from(catalogCategory)
    .where(
      and(
        eq(catalogCategory.parentId, categoryId),
        eq(catalogCategory.status, "published"),
      ),
    )
    .limit(1);
  const [publishedProduct] = await transaction
    .select({ id: catalogProduct.id })
    .from(catalogProduct)
    .leftJoin(
      catalogProductAdditionalCategory,
      eq(catalogProductAdditionalCategory.productId, catalogProduct.id),
    )
    .where(
      and(
        eq(catalogProduct.status, "published"),
        or(
          eq(catalogProduct.primaryCategoryId, categoryId),
          eq(catalogProductAdditionalCategory.categoryId, categoryId),
        ),
      ),
    )
    .limit(1);

  if (publishedChild || publishedProduct) {
    throw new CatalogManagementError("PUBLISHED_DEPENDENCY_EXISTS");
  }
}
export async function assertCategoryCanArchive(
  transaction: CatalogTransaction,
  categoryId: string,
) {
  const rows = await transaction
    .select({
      id: catalogCategory.id,
      parentId: catalogCategory.parentId,
      status: catalogCategory.status,
    })
    .from(catalogCategory);
  const descendants = new Set<string>();
  let frontier = [categoryId];

  while (frontier.length > 0) {
    const children = rows.filter(
      (row) =>
        row.parentId &&
        frontier.includes(row.parentId) &&
        !descendants.has(row.id),
    );
    frontier = children.map(({ id }) => id);
    children.forEach(({ id }) => descendants.add(id));
  }

  if (
    rows.some((row) => descendants.has(row.id) && row.status !== "archived")
  ) {
    throw new CatalogManagementError("ACTIVE_DEPENDENCY_EXISTS");
  }

  const affectedCategoryIds = [categoryId, ...descendants];
  const [dependentProduct] = await transaction
    .select({ id: catalogProduct.id })
    .from(catalogProduct)
    .leftJoin(
      catalogProductAdditionalCategory,
      eq(catalogProductAdditionalCategory.productId, catalogProduct.id),
    )
    .where(
      and(
        ne(catalogProduct.status, "archived"),
        or(
          inArray(catalogProduct.primaryCategoryId, affectedCategoryIds),
          inArray(
            catalogProductAdditionalCategory.categoryId,
            affectedCategoryIds,
          ),
        ),
      ),
    )
    .limit(1);

  if (dependentProduct) {
    throw new CatalogManagementError("ACTIVE_DEPENDENCY_EXISTS");
  }
}
