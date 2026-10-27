import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogCategory } from "@/db/schema";
import {
  getCategoryPublicationAggregate,
  lockCatalogCategory,
} from "./category-repository";
import { CatalogManagementError } from "./management-errors";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "./management-access";
import { lockAndValidateCategoryPath } from "./management-category-path";
import { assertCategoryPublishable } from "./management-category-readiness";
import {
  assertCategoryCanArchive,
  assertCategoryCanUnpublish,
} from "./management-category-dependencies";
async function transitionCatalogCategory(input: {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  intent: "publish" | "unpublish" | "archive" | "restore";
}) {
  assertIdentifier(input.categoryId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);
    const updatedAt = new Date();

    if (input.intent === "publish") {
      if (category.status !== "draft") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await lockAndValidateCategoryPath(
        transaction,
        category.id,
        category.parentId,
      );

      const aggregate = await getCategoryPublicationAggregate(
        transaction,
        category.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertCategoryPublishable(aggregate);
      await transaction
        .update(catalogCategory)
        .set({
          status: "published",
          publishedAt: category.publishedAt ?? updatedAt,
          archivedAt: null,
          updatedAt,
        })
        .where(eq(catalogCategory.id, category.id));
    } else if (input.intent === "unpublish") {
      if (category.status !== "published") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await assertCategoryCanUnpublish(transaction, category.id);

      await transaction
        .update(catalogCategory)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    } else if (input.intent === "restore") {
      if (category.status !== "archived") {
        throw new CatalogManagementError("ARCHIVED_ANCESTOR");
      }

      const ancestors = await lockAndValidateCategoryPath(
        transaction,
        category.id,
        category.parentId,
      );
      if (ancestors.some(({ status }) => status === "archived")) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await transaction
        .update(catalogCategory)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    } else {
      if (category.status === "archived") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await assertCategoryCanArchive(transaction, category.id);

      await transaction
        .update(catalogCategory)
        .set({ status: "archived", archivedAt: updatedAt, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    }

    return {
      id: category.id,
      status:
        input.intent === "publish"
          ? "published"
          : input.intent === "archive"
            ? "archived"
            : "draft",
      publishedAt:
        (
          category.publishedAt ??
          (input.intent === "publish" ? updatedAt : null)
        )?.toISOString() ?? null,
      updatedAt: updatedAt.toISOString(),
    };
  });
}

export const publishCatalogCategory = (
  input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">,
) => transitionCatalogCategory({ ...input, intent: "publish" });

export const unpublishCatalogCategory = (
  input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">,
) => transitionCatalogCategory({ ...input, intent: "unpublish" });

export const archiveCatalogCategory = (
  input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">,
) => transitionCatalogCategory({ ...input, intent: "archive" });

export const restoreCatalogCategory = (
  input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">,
) => transitionCatalogCategory({ ...input, intent: "restore" });
