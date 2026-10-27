import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogCategory } from "@/db/schema";
import { CatalogManagementError } from "./management-errors";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "./management-access";
import { assertCategoryExists } from "./management-category-data";
import {
  assertCategorySlugAvailable,
  nextCategorySortOrder,
  categorySlugConstraintLocale,
} from "./management-category-input";
import { lockCategoryMoveRows } from "./management-category-path";
export async function moveCatalogCategory(input: {
  actorId: string;
  categoryId: string;
  parentId: string | null;
  expectedUpdatedAt: string;
}) {
  assertIdentifier(input.categoryId);
  if (input.parentId) assertIdentifier(input.parentId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCategoryMoveRows(
      transaction,
      input.categoryId,
      input.parentId,
    );

    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    if (input.parentId) {
      const parent = await assertCategoryExists(transaction, input.parentId);

      if (category.status === "published" && parent.status !== "published") {
        throw new CatalogManagementError("PUBLICATION_INVALID");
      }
    }

    await assertCategorySlugAvailable(
      transaction,
      input.parentId,
      "bg",
      category.bgSlug,
      category.id,
    );
    await assertCategorySlugAvailable(
      transaction,
      input.parentId,
      "en",
      category.enSlug,
      category.id,
    );
    const sortOrder = await nextCategorySortOrder(
      transaction,
      input.parentId,
      category.id,
    );

    const updatedAt = new Date();
    try {
      await transaction
        .update(catalogCategory)
        .set({ parentId: input.parentId, sortOrder, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    } catch (error) {
      const locale = categorySlugConstraintLocale(error);
      if (locale) {
        throw new CatalogManagementError("SLUG_CONFLICT", { locale });
      }

      throw error;
    }
    return { id: category.id, updatedAt: updatedAt.toISOString() };
  });
}
