import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogProduct } from "@/db/schema";
import {
  getProductPublicationAggregate,
  lockCatalogProduct,
} from "@/lib/catalog/product-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "@/lib/catalog/management-access";
import {
  getProductAdditionalCategoryIds,
  assertProductCategories,
} from "./management-product-categories";
import { assertProductPublishable } from "@/lib/catalog/management-product-readiness";

async function transitionCatalogProduct(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  intent: "publish" | "unpublish" | "archive" | "restore";
}) {
  assertIdentifier(input.productId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);
    const updatedAt = new Date();

    if (input.intent === "publish") {
      if (product.status !== "draft") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const additionalCategoryIds = await getProductAdditionalCategoryIds(
        transaction,
        product.id,
      );
      await assertProductCategories(
        transaction,
        product.primaryCategoryId,
        additionalCategoryIds,
        true,
        true,
      );

      const aggregate = await getProductPublicationAggregate(
        transaction,
        product.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
      await transaction
        .update(catalogProduct)
        .set({
          status: "published",
          publishedAt: product.publishedAt ?? updatedAt,
          archivedAt: null,
          updatedAt,
        })
        .where(eq(catalogProduct.id, product.id));
    } else if (input.intent === "archive") {
      if (product.status === "archived") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await transaction
        .update(catalogProduct)
        .set({ status: "archived", archivedAt: updatedAt, updatedAt })
        .where(eq(catalogProduct.id, product.id));
    } else if (input.intent === "restore") {
      if (product.status !== "archived") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const additionalCategoryIds = await getProductAdditionalCategoryIds(
        transaction,
        product.id,
      );
      await assertProductCategories(
        transaction,
        product.primaryCategoryId,
        additionalCategoryIds,
        false,
        true,
      );

      await transaction
        .update(catalogProduct)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogProduct.id, product.id));
    } else {
      if (product.status !== "published") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await transaction
        .update(catalogProduct)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogProduct.id, product.id));
    }

    return {
      id: product.id,
      status:
        input.intent === "publish"
          ? "published"
          : input.intent === "archive"
            ? "archived"
            : "draft",
      publishedAt:
        (
          product.publishedAt ?? (input.intent === "publish" ? updatedAt : null)
        )?.toISOString() ?? null,
      updatedAt: updatedAt.toISOString(),
    };
  });
}

export const publishCatalogProduct = (
  input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">,
) => transitionCatalogProduct({ ...input, intent: "publish" });

export const unpublishCatalogProduct = (
  input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">,
) => transitionCatalogProduct({ ...input, intent: "unpublish" });

export const archiveCatalogProduct = (
  input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">,
) => transitionCatalogProduct({ ...input, intent: "archive" });

export const restoreCatalogProduct = (
  input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">,
) => transitionCatalogProduct({ ...input, intent: "restore" });
