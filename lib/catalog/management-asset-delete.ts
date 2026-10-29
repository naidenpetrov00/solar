import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategory,
  catalogCategoryCover,
  catalogManagedAsset,
  catalogProduct,
  catalogProductDocument,
  catalogProductMedia,
} from "@/db/schema";
import { catalogAssetStorage } from "@/lib/storage";
import {
  assertCatalogActor,
  assertFresh,
  assertIdentifier,
} from "./management-access";
import { CatalogManagementError } from "./management-errors";

async function physicallyDelete(asset: { id: string; objectKey: string } | null) {
  if (!asset) return false;
  try {
    await catalogAssetStorage.deleteObject(asset.objectKey);
    await db.delete(catalogManagedAsset).where(eq(catalogManagedAsset.id, asset.id));
    return false;
  } catch {
    return true;
  }
}

export async function deleteCatalogProductImage(input: {
  actorId: string;
  productId: string;
  mediaId: string;
  expectedAssetsUpdatedAt: string;
}) {
  assertIdentifier(input.productId);
  assertIdentifier(input.mediaId);
  const result = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [product] = await transaction
      .select()
      .from(catalogProduct)
      .where(eq(catalogProduct.id, input.productId))
      .limit(1)
      .for("update");
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
    const media = await transaction
      .select()
      .from(catalogProductMedia)
      .where(eq(catalogProductMedia.productId, product.id));
    const target = media.find(({ id }) => id === input.mediaId);
    if (!target) throw new CatalogManagementError("NOT_FOUND");
    if (product.status === "published" && target.isPrimary) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }
    const asset = target.assetId
      ? (
          await transaction
            .select({ id: catalogManagedAsset.id, objectKey: catalogManagedAsset.objectKey })
            .from(catalogManagedAsset)
            .where(eq(catalogManagedAsset.id, target.assetId))
            .limit(1)
        )[0] ?? null
      : null;
    const now = new Date();
    await transaction
      .delete(catalogProductMedia)
      .where(eq(catalogProductMedia.id, target.id));
    if (asset) {
      await transaction
        .update(catalogManagedAsset)
        .set({ state: "delete_pending", updatedAt: now })
        .where(eq(catalogManagedAsset.id, asset.id));
    }
    await transaction
      .update(catalogProduct)
      .set({ assetsUpdatedAt: now })
      .where(eq(catalogProduct.id, product.id));
    return { asset, assetsUpdatedAt: now.toISOString() };
  });
  const cleanupPending = await physicallyDelete(result.asset);
  return { assetsUpdatedAt: result.assetsUpdatedAt, cleanupPending };
}

export async function deleteCatalogProductDocument(input: {
  actorId: string;
  productId: string;
  documentId: string;
  expectedAssetsUpdatedAt: string;
}) {
  assertIdentifier(input.productId);
  assertIdentifier(input.documentId);
  const result = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [product] = await transaction
      .select()
      .from(catalogProduct)
      .where(eq(catalogProduct.id, input.productId))
      .limit(1)
      .for("update");
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
    const [document] = await transaction
      .select({ id: catalogProductDocument.id, assetId: catalogProductDocument.assetId })
      .from(catalogProductDocument)
      .where(eq(catalogProductDocument.id, input.documentId))
      .limit(1);
    if (!document) throw new CatalogManagementError("NOT_FOUND");
    const [asset] = await transaction
      .select({ id: catalogManagedAsset.id, objectKey: catalogManagedAsset.objectKey })
      .from(catalogManagedAsset)
      .where(eq(catalogManagedAsset.id, document.assetId))
      .limit(1);
    const now = new Date();
    await transaction.delete(catalogProductDocument).where(eq(catalogProductDocument.id, document.id));
    if (asset) {
      await transaction.update(catalogManagedAsset).set({ state: "delete_pending", updatedAt: now }).where(eq(catalogManagedAsset.id, asset.id));
    }
    await transaction.update(catalogProduct).set({ assetsUpdatedAt: now }).where(eq(catalogProduct.id, product.id));
    return { asset: asset ?? null, assetsUpdatedAt: now.toISOString() };
  });
  const cleanupPending = await physicallyDelete(result.asset);
  return { assetsUpdatedAt: result.assetsUpdatedAt, cleanupPending };
}

export async function deleteCatalogCategoryCover(input: {
  actorId: string;
  categoryId: string;
  expectedAssetsUpdatedAt: string;
}) {
  assertIdentifier(input.categoryId);
  const result = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [category] = await transaction.select().from(catalogCategory).where(eq(catalogCategory.id, input.categoryId)).limit(1).for("update");
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
    const [cover] = await transaction.select({ assetId: catalogCategoryCover.assetId }).from(catalogCategoryCover).where(eq(catalogCategoryCover.categoryId, category.id)).limit(1);
    if (!cover) throw new CatalogManagementError("NOT_FOUND");
    const [asset] = await transaction.select({ id: catalogManagedAsset.id, objectKey: catalogManagedAsset.objectKey }).from(catalogManagedAsset).where(eq(catalogManagedAsset.id, cover.assetId)).limit(1);
    const now = new Date();
    await transaction.delete(catalogCategoryCover).where(eq(catalogCategoryCover.categoryId, category.id));
    if (asset) await transaction.update(catalogManagedAsset).set({ state: "delete_pending", updatedAt: now }).where(eq(catalogManagedAsset.id, asset.id));
    await transaction.update(catalogCategory).set({ assetsUpdatedAt: now }).where(eq(catalogCategory.id, category.id));
    return { asset: asset ?? null, assetsUpdatedAt: now.toISOString() };
  });
  const cleanupPending = await physicallyDelete(result.asset);
  return { assetsUpdatedAt: result.assetsUpdatedAt, cleanupPending };
}
