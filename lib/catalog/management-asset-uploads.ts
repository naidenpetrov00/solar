import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogAssetUpload,
  catalogCategoryCover,
  catalogProductDocument,
  catalogProductMedia,
} from "@/db/schema";
import { catalogAssetStorage, catalogStorageProvider } from "@/lib/storage";
import { lockCatalogProduct } from "./product-repository";
import { lockCatalogCategory } from "./category-repository";
import {
  assertCatalogActor,
  assertFresh,
  assertIdentifier,
} from "./management-access";
import { CatalogManagementError } from "./management-errors";
import type {
  CatalogUploadAuthorization,
  UploadDescriptor,
} from "./management-asset-types";
import { validateUploadDescriptor } from "./management-asset-validation";
import type { CatalogUploadPurpose } from "@/lib/storage/catalog-asset-storage";

const authorizationDurationMs = 10 * 60 * 1000;
const finalizationDurationMs = 24 * 60 * 60 * 1000;

function attachmentFilename(value: string) {
  const filename = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 120);
  return filename.toLowerCase().endsWith(".pdf")
    ? filename || "document.pdf"
    : `${filename || "document"}.pdf`;
}

function disposition(purpose: CatalogUploadPurpose, filename: string) {
  return purpose === "product_document"
    ? `attachment; filename="${attachmentFilename(filename)}"`
    : "inline";
}

export async function authorizeCatalogUploads(input: {
  actorId: string;
  targetId: string;
  expectedAssetsUpdatedAt: string;
  purpose: CatalogUploadPurpose;
  files: UploadDescriptor[];
}): Promise<CatalogUploadAuthorization[]> {
  assertIdentifier(input.targetId);
  if (input.files.length < 1 || input.files.length > 12) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  const descriptors = input.files.map((file) => ({
    file,
    normalized: validateUploadDescriptor(input.purpose, file),
  }));
  const now = new Date();
  const authorizationExpiresAt = new Date(now.getTime() + authorizationDurationMs);
  const finalizationExpiresAt = new Date(now.getTime() + finalizationDurationMs);

  const uploads = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    if (input.purpose === "category_cover") {
      const category = await lockCatalogCategory(transaction, input.targetId);
      if (!category) throw new CatalogManagementError("NOT_FOUND");
      assertFresh(category.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
      const live = await transaction
        .select({ id: catalogAssetUpload.id })
        .from(catalogAssetUpload)
        .where(
          and(
            eq(catalogAssetUpload.categoryId, input.targetId),
            eq(catalogAssetUpload.purpose, "category_cover"),
            inArray(catalogAssetUpload.state, ["pending", "promoted"]),
            gt(catalogAssetUpload.finalizationExpiresAt, now),
          ),
        );
      if (descriptors.length !== 1 || live.length > 0) {
        throw new CatalogManagementError("ASSET_LIMIT_REACHED");
      }
      await transaction
        .select({ categoryId: catalogCategoryCover.categoryId })
        .from(catalogCategoryCover)
        .where(eq(catalogCategoryCover.categoryId, input.targetId));
    } else {
      const product = await lockCatalogProduct(transaction, input.targetId);
      if (!product) throw new CatalogManagementError("NOT_FOUND");
      assertFresh(product.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
      const existing = input.purpose === "product_image"
        ? await transaction
            .select({ id: catalogProductMedia.id })
            .from(catalogProductMedia)
            .where(eq(catalogProductMedia.productId, input.targetId))
        : await transaction
            .select({ id: catalogProductDocument.id })
            .from(catalogProductDocument)
            .where(eq(catalogProductDocument.productId, input.targetId));
      const pending = await transaction
        .select({ id: catalogAssetUpload.id })
        .from(catalogAssetUpload)
        .where(
          and(
            eq(catalogAssetUpload.productId, input.targetId),
            eq(catalogAssetUpload.purpose, input.purpose),
            inArray(catalogAssetUpload.state, ["pending", "promoted"]),
            gt(catalogAssetUpload.finalizationExpiresAt, now),
          ),
        );
      const limit = input.purpose === "product_image" ? 12 : 10;
      if (existing.length + pending.length + descriptors.length > limit) {
        throw new CatalogManagementError("ASSET_LIMIT_REACHED");
      }
    }

    const rows = descriptors.map(({ file, normalized }) => {
      const id = randomUUID();
      const objectId = randomUUID();
      return {
        id,
        actorId: input.actorId,
        purpose: input.purpose,
        productId: input.purpose === "category_cover" ? null : input.targetId,
        categoryId: input.purpose === "category_cover" ? input.targetId : null,
        provider: catalogStorageProvider,
        temporaryKey: `catalog/pending/${id}/${objectId}.${normalized.extension}`,
        finalKey: `catalog/assets/${input.purpose}/${objectId}.${normalized.extension}`,
        originalFilename: normalized.originalFilename,
        uploadFilename: normalized.uploadFilename,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        authorizationExpiresAt,
        finalizationExpiresAt,
      };
    });
    await transaction.insert(catalogAssetUpload).values(rows);
    return rows;
  });

  try {
    return await Promise.all(
      uploads.map(async (upload) => {
        const authorization =
          await catalogAssetStorage.createDirectUploadAuthorization({
            uploadId: upload.id,
            temporaryKey: upload.temporaryKey,
            mimeType: upload.mimeType,
            byteSize: upload.byteSize,
            disposition: disposition(upload.purpose, upload.originalFilename),
            expiresAt: upload.authorizationExpiresAt,
          });
        return {
          uploadId: upload.id,
          purpose: upload.purpose as CatalogUploadPurpose,
          ...authorization,
        };
      }),
    );
  } catch {
    await db
      .delete(catalogAssetUpload)
      .where(inArray(catalogAssetUpload.id, uploads.map(({ id }) => id)));
    throw new CatalogManagementError("STORAGE_ERROR");
  }
}

export function catalogUploadDisposition(
  purpose: CatalogUploadPurpose,
  filename: string,
) {
  return disposition(purpose, filename);
}
