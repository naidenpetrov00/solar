"use server";

import { moveCatalogCategory } from "@/lib/catalog/management-category-move";
import { reorderCatalogCategories } from "@/lib/catalog/management-category-reorder";
import {
  archiveCatalogCategory,
  publishCatalogCategory,
  restoreCatalogCategory,
  unpublishCatalogCategory,
} from "@/lib/catalog/management-category-publication";
import { isUuid } from "@/lib/catalog/model";
import {
  actionLocale,
  errorResult,
  isValidTimestamp,
  requireCatalogManager,
  revalidateCatalog,
  stringValue,
  stringValues,
} from "./category-action-context";
import type {
  CatalogActionCode,
  CatalogActionResult,
} from "./category-action-model";
import { parseReorderCategories } from "./category-action-reorder";

export async function manageCatalogCategoryAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const categoryId = stringValue(formData, "categoryId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const intent = stringValue(formData, "intent");

  if (!locale || !isUuid(categoryId) || !isValidTimestamp(expectedUpdatedAt)) {
    return { status: "error", code: "INVALID_INPUT", values };
  }

  try {
    const actor = await requireCatalogManager();
    let successCode: CatalogActionCode;

    if (intent === "move") {
      const parentId = stringValue(formData, "parentId") || null;

      if (parentId !== null && !isUuid(parentId)) {
        return { status: "error", code: "INVALID_INPUT", values };
      }

      await moveCatalogCategory({
        actorId: actor.id,
        categoryId,
        parentId,
        expectedUpdatedAt,
      });
      successCode = "MOVED";
    } else if (intent === "reorder") {
      const categories = parseReorderCategories(
        stringValue(formData, "categories"),
      );
      if (!categories) {
        return { status: "error", code: "INVALID_INPUT", values };
      }
      await reorderCatalogCategories({ actorId: actor.id, categories });
      successCode = "REORDERED";
    } else if (intent === "publish") {
      await publishCatalogCategory({
        actorId: actor.id,
        categoryId,
        expectedUpdatedAt,
      });
      successCode = "PUBLISHED";
    } else if (intent === "unpublish") {
      await unpublishCatalogCategory({
        actorId: actor.id,
        categoryId,
        expectedUpdatedAt,
      });
      successCode = "UNPUBLISHED";
    } else if (intent === "archive") {
      await archiveCatalogCategory({
        actorId: actor.id,
        categoryId,
        expectedUpdatedAt,
      });
      successCode = "ARCHIVED";
    } else if (intent === "restore") {
      await restoreCatalogCategory({
        actorId: actor.id,
        categoryId,
        expectedUpdatedAt,
      });
      successCode = "RESTORED";
    } else {
      return { status: "error", code: "INVALID_INPUT", values };
    }

    revalidateCatalog(locale);
    return {
      status: "success",
      code: successCode,
      targetId: categoryId,
    };
  } catch (error) {
    return errorResult(error, values);
  }
}
