import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { catalogCategory } from "@/db/schema";
import { validateNonNegativeInteger } from "./model";
import { CatalogManagementError } from "./management-errors";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "./management-access";
export async function reorderCatalogCategories(input: {
  actorId: string;
  categories: Array<{
    id: string;
    sortOrder: number;
    expectedUpdatedAt: string;
  }>;
}) {
  const ids = input.categories.map(({ id }) => id);

  if (new Set(ids).size !== ids.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  ids.forEach(assertIdentifier);
  input.categories.forEach(({ sortOrder }) =>
    validateNonNegativeInteger(sortOrder),
  );

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");

    if (ids.length === 0) return [];

    const rows = await transaction
      .select()
      .from(catalogCategory)
      .where(inArray(catalogCategory.id, [...ids].sort()))
      .orderBy(asc(catalogCategory.id))
      .for("update");

    if (rows.length !== ids.length)
      throw new CatalogManagementError("NOT_FOUND");
    if (new Set(rows.map(({ parentId }) => parentId)).size !== 1) {
      throw new CatalogManagementError("INVALID_INPUT");
    }
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const updatedAt = new Date();

    for (const item of input.categories) {
      const row = rowById.get(item.id);
      if (!row) throw new CatalogManagementError("NOT_FOUND");
      assertFresh(row.updatedAt, item.expectedUpdatedAt);
      await transaction
        .update(catalogCategory)
        .set({ sortOrder: item.sortOrder, updatedAt })
        .where(eq(catalogCategory.id, item.id));
    }

    return input.categories.map(({ id }) => ({
      id,
      updatedAt: updatedAt.toISOString(),
    }));
  });
}
