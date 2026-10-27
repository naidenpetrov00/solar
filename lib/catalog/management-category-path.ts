import "server-only";
import { asc, inArray } from "drizzle-orm";
import { catalogCategory } from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import { CatalogManagementError } from "./management-errors";
export async function lockAndValidateCategoryPath(
  transaction: CatalogTransaction,
  categoryId: string,
  parentId: string | null,
) {
  if (parentId === null) return [];
  if (categoryId === parentId) throw new CatalogManagementError("CYCLE");

  const lockedIds = new Set<string>();

  for (;;) {
    const rows = await transaction
      .select({
        id: catalogCategory.id,
        parentId: catalogCategory.parentId,
        status: catalogCategory.status,
      })
      .from(catalogCategory);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const path: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = parentId;

    while (cursor !== null) {
      if (cursor === categoryId || seen.has(cursor)) {
        throw new CatalogManagementError("CYCLE");
      }

      const row = rowById.get(cursor);
      if (!row) {
        throw new CatalogManagementError("NOT_FOUND");
      }

      seen.add(cursor);
      path.push(cursor);
      cursor = row.parentId;
    }

    const unlocked = path.filter((id) => !lockedIds.has(id)).sort();

    if (unlocked.length === 0) {
      return path.map((id) => {
        const row = rowById.get(id);
        if (!row) throw new CatalogManagementError("NOT_FOUND");
        return row;
      });
    }

    await transaction
      .select({ id: catalogCategory.id })
      .from(catalogCategory)
      .where(inArray(catalogCategory.id, unlocked))
      .orderBy(asc(catalogCategory.id))
      .for("update");
    unlocked.forEach((id) => lockedIds.add(id));
  }
}

export async function lockCategoryMoveRows(
  transaction: CatalogTransaction,
  categoryId: string,
  parentId: string | null,
) {
  if (categoryId === parentId) throw new CatalogManagementError("CYCLE");

  const rows = await transaction
    .select({
      id: catalogCategory.id,
      parentId: catalogCategory.parentId,
    })
    .from(catalogCategory);
  const parentById = new Map(rows.map((row) => [row.id, row.parentId]));

  if (!parentById.has(categoryId)) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const path: string[] = [];
  const seen = new Set<string>();
  let cursor = parentId;

  while (cursor !== null) {
    if (cursor === categoryId || seen.has(cursor)) {
      throw new CatalogManagementError("CYCLE");
    }

    if (!parentById.has(cursor)) {
      throw new CatalogManagementError("NOT_FOUND");
    }

    seen.add(cursor);
    path.push(cursor);
    cursor = parentById.get(cursor) ?? null;
  }

  const lockIds = [...new Set([categoryId, ...path])].sort();
  const lockedRows = await transaction
    .select()
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, lockIds))
    .orderBy(asc(catalogCategory.id))
    .for("update");
  const lockedById = new Map(lockedRows.map((row) => [row.id, row]));
  const category = lockedById.get(categoryId);

  if (!category || lockedRows.length !== lockIds.length) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const lockedPath: string[] = [];
  const lockedSeen = new Set<string>();
  cursor = parentId;

  while (cursor !== null) {
    if (cursor === categoryId || lockedSeen.has(cursor)) {
      throw new CatalogManagementError("CYCLE");
    }

    const row = lockedById.get(cursor);
    if (!row) throw new CatalogManagementError("STALE");
    lockedSeen.add(cursor);
    lockedPath.push(cursor);
    cursor = row.parentId;
  }

  if (
    lockedPath.length !== path.length ||
    lockedPath.some((id, index) => id !== path[index])
  ) {
    throw new CatalogManagementError("STALE");
  }

  return category;
}
