import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogAssetUpload,
  catalogCategory,
  catalogCategoryCover,
  catalogCategoryCoverTranslation,
  catalogManagedAsset,
  catalogProduct,
  catalogProductDocument,
  catalogProductDocumentTranslation,
  catalogProductMedia,
  catalogProductMediaTranslation,
} from "@/db/schema";
import {
  catalogAssetStorage,
  CatalogStorageError,
  catalogStorageProvider,
} from "@/lib/storage";
import { CatalogManagementError } from "./management-errors";
import {
  assertCatalogActor,
  assertFresh,
  assertIdentifier,
} from "./management-access";
import type { FinalizeCatalogUploadInput } from "./management-asset-types";
import {
  normalizeAltTranslations,
  normalizeDocumentTranslations,
} from "./management-asset-validation";
import { catalogUploadDisposition } from "./management-asset-uploads";
import type { CatalogUploadPurpose } from "@/lib/storage/catalog-asset-storage";

type FinalizeResult = {
  assetId: string;
  associationId: string;
  assetsUpdatedAt: string;
  purpose: CatalogUploadPurpose;
};

async function attachedResult(upload: typeof catalogAssetUpload.$inferSelect) {
  if (upload.purpose === "category_cover" && upload.categoryId) {
    const [category] = await db
      .select({ assetsUpdatedAt: catalogCategory.assetsUpdatedAt })
      .from(catalogCategory)
      .where(eq(catalogCategory.id, upload.categoryId));
    return category
      ? {
          assetId: upload.id,
          associationId: upload.categoryId,
          assetsUpdatedAt: category.assetsUpdatedAt.toISOString(),
          purpose: upload.purpose as CatalogUploadPurpose,
        }
      : null;
  }
  if (!upload.productId) return null;
  const [product] = await db
    .select({ assetsUpdatedAt: catalogProduct.assetsUpdatedAt })
    .from(catalogProduct)
    .where(eq(catalogProduct.id, upload.productId));
  const association =
    upload.purpose === "product_image"
      ? await db
          .select({ id: catalogProductMedia.id })
          .from(catalogProductMedia)
          .where(eq(catalogProductMedia.assetId, upload.id))
          .limit(1)
      : await db
          .select({ id: catalogProductDocument.id })
          .from(catalogProductDocument)
          .where(eq(catalogProductDocument.assetId, upload.id))
          .limit(1);
  return product && association[0]
    ? {
        assetId: upload.id,
        associationId: association[0].id,
        assetsUpdatedAt: product.assetsUpdatedAt.toISOString(),
        purpose: upload.purpose as CatalogUploadPurpose,
      }
    : null;
}

async function removeReplacedAsset(asset: { id: string; objectKey: string } | null) {
  if (!asset) return;
  try {
    await catalogAssetStorage.deleteObject(asset.objectKey);
    await db.delete(catalogManagedAsset).where(eq(catalogManagedAsset.id, asset.id));
  } catch {
    // The delete_pending row is intentionally retained for cleanup retry.
  }
}

export async function finalizeCatalogUpload(
  input: FinalizeCatalogUploadInput,
): Promise<FinalizeResult> {
  assertIdentifier(input.uploadId);
  assertIdentifier(input.targetId);
  const upload = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [row] = await transaction
      .select()
      .from(catalogAssetUpload)
      .where(eq(catalogAssetUpload.id, input.uploadId))
      .limit(1);
    return row;
  });
  if (!upload) throw new CatalogManagementError("NOT_FOUND");
  if (
    upload.actorId !== input.actorId ||
    (upload.productId ?? upload.categoryId) !== input.targetId ||
    upload.provider !== catalogStorageProvider
  ) {
    throw new CatalogManagementError("FORBIDDEN");
  }
  if (upload.state === "attached") {
    const result = await attachedResult(upload);
    if (result) return result;
  }
  if (upload.finalizationExpiresAt.getTime() <= Date.now()) {
    throw new CatalogManagementError("UPLOAD_EXPIRED");
  }

  let verified;
  try {
    verified = await catalogAssetStorage.inspectAndPromoteUpload({
      uploadId: upload.id,
      temporaryKey: upload.temporaryKey,
      finalKey: upload.finalKey,
      mimeType: upload.mimeType,
      byteSize: upload.byteSize,
      disposition: catalogUploadDisposition(
        upload.purpose as "product_image" | "product_document" | "category_cover",
        upload.originalFilename,
      ),
      purpose: upload.purpose as
        | "product_image"
        | "product_document"
        | "category_cover",
    });
    await db
      .update(catalogAssetUpload)
      .set({ state: "promoted", updatedAt: new Date() })
      .where(
        and(
          eq(catalogAssetUpload.id, upload.id),
          eq(catalogAssetUpload.actorId, input.actorId),
        ),
      );
  } catch (error) {
    if (
      error instanceof CatalogStorageError &&
      error.code === "OBJECT_MISMATCH"
    ) {
      await db
        .update(catalogAssetUpload)
        .set({ state: "failed", updatedAt: new Date() })
        .where(eq(catalogAssetUpload.id, upload.id));
      try {
        await catalogAssetStorage.deleteObject(upload.temporaryKey);
      } catch {}
      throw new CatalogManagementError("INVALID_INPUT");
    }
    throw new CatalogManagementError("STORAGE_ERROR");
  }

  const altTranslations = normalizeAltTranslations(
    input.altTranslations,
    upload.purpose === "category_cover",
  );
  const documentTranslations =
    upload.purpose === "product_document"
      ? normalizeDocumentTranslations(input.documentTranslations)
      : [];

  const transactionResult = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [lockedUpload] = await transaction
      .select()
      .from(catalogAssetUpload)
      .where(eq(catalogAssetUpload.id, upload.id))
      .limit(1)
      .for("update");
    if (!lockedUpload || lockedUpload.actorId !== input.actorId) {
      throw new CatalogManagementError("FORBIDDEN");
    }
    if (lockedUpload.state === "attached") return { idempotent: true as const };
    const now = new Date();
    await transaction
      .insert(catalogManagedAsset)
      .values({
        id: upload.id,
        provider: upload.provider,
        objectKey: upload.finalKey,
        originalFilename: upload.originalFilename,
        mimeType: verified.mimeType,
        byteSize: verified.byteSize,
        width: verified.width,
        height: verified.height,
        createdByActorId: input.actorId,
      })
      .onConflictDoNothing({ target: catalogManagedAsset.id });

    let associationId: string;
    let replacedAsset: { id: string; objectKey: string } | null = null;
    if (upload.purpose === "category_cover" && upload.categoryId) {
      const [category] = await transaction
        .select()
        .from(catalogCategory)
        .where(eq(catalogCategory.id, upload.categoryId))
        .limit(1)
        .for("update");
      if (!category) throw new CatalogManagementError("NOT_FOUND");
      assertFresh(category.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
      const [current] = await transaction
        .select({
          assetId: catalogCategoryCover.assetId,
          objectKey: catalogManagedAsset.objectKey,
        })
        .from(catalogCategoryCover)
        .innerJoin(
          catalogManagedAsset,
          eq(catalogManagedAsset.id, catalogCategoryCover.assetId),
        )
        .where(eq(catalogCategoryCover.categoryId, category.id))
        .limit(1);
      if (current) {
        replacedAsset = { id: current.assetId, objectKey: current.objectKey };
        await transaction
          .delete(catalogCategoryCover)
          .where(eq(catalogCategoryCover.categoryId, category.id));
        await transaction
          .update(catalogManagedAsset)
          .set({ state: "delete_pending", updatedAt: now })
          .where(eq(catalogManagedAsset.id, current.assetId));
      }
      await transaction.insert(catalogCategoryCover).values({
        categoryId: category.id,
        assetId: upload.id,
      });
      await transaction.insert(catalogCategoryCoverTranslation).values(
        altTranslations.map((translation) => ({
          categoryId: category.id,
          ...translation,
        })),
      );
      await transaction
        .update(catalogCategory)
        .set({ assetsUpdatedAt: now })
        .where(eq(catalogCategory.id, category.id));
      associationId = category.id;
    } else if (upload.productId) {
      const [product] = await transaction
        .select()
        .from(catalogProduct)
        .where(eq(catalogProduct.id, upload.productId))
        .limit(1)
        .for("update");
      if (!product) throw new CatalogManagementError("NOT_FOUND");
      assertFresh(product.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
      associationId = randomUUID();
      if (upload.purpose === "product_image") {
        const media = await transaction
          .select()
          .from(catalogProductMedia)
          .where(eq(catalogProductMedia.productId, product.id))
          .orderBy(asc(catalogProductMedia.displayOrder));
        if (media.length >= 12) {
          throw new CatalogManagementError("ASSET_LIMIT_REACHED");
        }
        if (product.status === "published" && altTranslations.length !== 4) {
          throw new CatalogManagementError("PUBLICATION_INVALID");
        }
        await transaction.insert(catalogProductMedia).values({
          id: associationId,
          productId: product.id,
          assetId: upload.id,
          reference: null,
          displayOrder: media.length,
          isPrimary: media.length === 0,
          isSocialImage: false,
        });
        if (altTranslations.length > 0) {
          await transaction.insert(catalogProductMediaTranslation).values(
            altTranslations.map((translation) => ({
              productMediaId: associationId,
              ...translation,
            })),
          );
        }
      } else {
        const documents = await transaction
          .select()
          .from(catalogProductDocument)
          .where(eq(catalogProductDocument.productId, product.id))
          .orderBy(asc(catalogProductDocument.displayOrder));
        if (documents.length >= 10) {
          throw new CatalogManagementError("ASSET_LIMIT_REACHED");
        }
        await transaction.insert(catalogProductDocument).values({
          id: associationId,
          productId: product.id,
          assetId: upload.id,
          displayOrder: documents.length,
        });
        await transaction.insert(catalogProductDocumentTranslation).values(
          documentTranslations.map((translation) => ({
            documentId: associationId,
            ...translation,
          })),
        );
      }
      await transaction
        .update(catalogProduct)
        .set({ assetsUpdatedAt: now })
        .where(eq(catalogProduct.id, product.id));
    } else {
      throw new CatalogManagementError("INVALID_INPUT");
    }
    await transaction
      .update(catalogAssetUpload)
      .set({ state: "attached", updatedAt: now })
      .where(eq(catalogAssetUpload.id, upload.id));
    return {
      idempotent: false as const,
      associationId,
      assetsUpdatedAt: now.toISOString(),
      replacedAsset,
    };
  });

  if (transactionResult.idempotent) {
    const result = await attachedResult({ ...upload, state: "attached" });
    if (!result) throw new CatalogManagementError("NOT_FOUND");
    return result;
  }
  await removeReplacedAsset(transactionResult.replacedAsset);
  return {
    assetId: upload.id,
    associationId: transactionResult.associationId,
    assetsUpdatedAt: transactionResult.assetsUpdatedAt,
    purpose: upload.purpose as CatalogUploadPurpose,
  };
}
