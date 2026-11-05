import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
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
import { catalogAssetStorage } from "@/lib/storage";
import { isCatalogLocale } from "./model";
import { assertCatalogActor, assertIdentifier } from "./management-access";
import { CatalogManagementError } from "./management-errors";
import type {
  ManagedCatalogCategoryAssetSlice,
  ManagedCatalogProductAssetSlice,
} from "./management-asset-types";

export async function getManagedCatalogProductAssets(
  actorId: string,
  productId: string,
): Promise<ManagedCatalogProductAssetSlice> {
  assertIdentifier(productId);
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, actorId, "catalog:view");
    const [product] = await transaction
      .select({ assetsUpdatedAt: catalogProduct.assetsUpdatedAt })
      .from(catalogProduct)
      .where(eq(catalogProduct.id, productId))
      .limit(1);
    if (!product) throw new CatalogManagementError("NOT_FOUND");

    const [media, mediaTranslations, documents, documentTranslations] =
      await Promise.all([
        transaction
          .select({
            id: catalogProductMedia.id,
            reference: catalogProductMedia.reference,
            displayOrder: catalogProductMedia.displayOrder,
            isPrimary: catalogProductMedia.isPrimary,
            isSocialImage: catalogProductMedia.isSocialImage,
            assetId: catalogProductMedia.assetId,
            objectKey: catalogManagedAsset.objectKey,
            originalFilename: catalogManagedAsset.originalFilename,
            mimeType: catalogManagedAsset.mimeType,
            byteSize: catalogManagedAsset.byteSize,
            width: catalogManagedAsset.width,
            height: catalogManagedAsset.height,
            assetState: catalogManagedAsset.state,
          })
          .from(catalogProductMedia)
          .leftJoin(
            catalogManagedAsset,
            eq(catalogManagedAsset.id, catalogProductMedia.assetId),
          )
          .where(eq(catalogProductMedia.productId, productId))
          .orderBy(asc(catalogProductMedia.displayOrder)),
        transaction
          .select({
            productMediaId: catalogProductMediaTranslation.productMediaId,
            locale: catalogProductMediaTranslation.locale,
            altText: catalogProductMediaTranslation.altText,
          })
          .from(catalogProductMediaTranslation)
          .innerJoin(
            catalogProductMedia,
            eq(
              catalogProductMedia.id,
              catalogProductMediaTranslation.productMediaId,
            ),
          )
          .where(eq(catalogProductMedia.productId, productId)),
        transaction
          .select({
            id: catalogProductDocument.id,
            assetId: catalogProductDocument.assetId,
            displayOrder: catalogProductDocument.displayOrder,
            objectKey: catalogManagedAsset.objectKey,
            originalFilename: catalogManagedAsset.originalFilename,
            mimeType: catalogManagedAsset.mimeType,
            byteSize: catalogManagedAsset.byteSize,
            assetState: catalogManagedAsset.state,
          })
          .from(catalogProductDocument)
          .innerJoin(
            catalogManagedAsset,
            eq(catalogManagedAsset.id, catalogProductDocument.assetId),
          )
          .where(eq(catalogProductDocument.productId, productId))
          .orderBy(asc(catalogProductDocument.displayOrder)),
        transaction
          .select({
            documentId: catalogProductDocumentTranslation.documentId,
            locale: catalogProductDocumentTranslation.locale,
            title: catalogProductDocumentTranslation.title,
            description: catalogProductDocumentTranslation.description,
          })
          .from(catalogProductDocumentTranslation)
          .innerJoin(
            catalogProductDocument,
            eq(
              catalogProductDocument.id,
              catalogProductDocumentTranslation.documentId,
            ),
          )
          .where(eq(catalogProductDocument.productId, productId)),
      ]);

    return {
      assetsUpdatedAt: product.assetsUpdatedAt.toISOString(),
      images: media.flatMap((item) => {
        const url = item.objectKey
          ? catalogAssetStorage.resolvePublicAssetUrl(item.objectKey)
          : item.reference;
        if (!url || (item.assetId && item.assetState !== "ready")) return [];
        return [{
          id: item.id,
          source: item.assetId ? ("managed" as const) : ("legacy" as const),
          reference: item.reference,
          url,
          originalFilename: item.originalFilename,
          mimeType: item.mimeType,
          byteSize: item.byteSize,
          width: item.width,
          height: item.height,
          displayOrder: item.displayOrder,
          isPrimary: item.isPrimary,
          isSocialImage: item.isSocialImage,
          translations: mediaTranslations.flatMap((translation) =>
            translation.productMediaId === item.id && isCatalogLocale(translation.locale)
              ? [{ locale: translation.locale, altText: translation.altText }]
              : [],
          ),
        }];
      }),
      documents: documents.flatMap((document) => {
        if (
          document.assetState !== "ready" ||
          document.mimeType !== "application/pdf"
        ) return [];
        return [{
          id: document.id,
          url: catalogAssetStorage.resolvePublicAssetUrl(document.objectKey),
          originalFilename: document.originalFilename,
          mimeType: "application/pdf" as const,
          byteSize: document.byteSize,
          displayOrder: document.displayOrder,
          translations: documentTranslations.flatMap((translation) =>
            translation.documentId === document.id && isCatalogLocale(translation.locale)
              ? [{
                  locale: translation.locale,
                  title: translation.title,
                  description: translation.description,
                }]
              : [],
          ),
        }];
      }),
    };
  });
}

export async function getManagedCatalogCategoryAsset(
  actorId: string,
  categoryId: string,
): Promise<ManagedCatalogCategoryAssetSlice> {
  assertIdentifier(categoryId);
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, actorId, "catalog:view");
    const [category] = await transaction
      .select({ assetsUpdatedAt: catalogCategory.assetsUpdatedAt })
      .from(catalogCategory)
      .where(eq(catalogCategory.id, categoryId))
      .limit(1);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    const [coverRows, translations] = await Promise.all([
      transaction
        .select({
          objectKey: catalogManagedAsset.objectKey,
          originalFilename: catalogManagedAsset.originalFilename,
          width: catalogManagedAsset.width,
          height: catalogManagedAsset.height,
          state: catalogManagedAsset.state,
        })
        .from(catalogCategoryCover)
        .innerJoin(
          catalogManagedAsset,
          eq(catalogManagedAsset.id, catalogCategoryCover.assetId),
        )
        .where(eq(catalogCategoryCover.categoryId, categoryId))
        .limit(1),
      transaction
        .select()
        .from(catalogCategoryCoverTranslation)
        .where(eq(catalogCategoryCoverTranslation.categoryId, categoryId)),
    ]);
    const cover = coverRows[0];
    return {
      assetsUpdatedAt: category.assetsUpdatedAt.toISOString(),
      cover:
        cover?.state === "ready" && cover.width && cover.height
          ? {
              url: catalogAssetStorage.resolvePublicAssetUrl(cover.objectKey),
              originalFilename: cover.originalFilename,
              width: cover.width,
              height: cover.height,
              translations: translations.flatMap((translation) =>
                isCatalogLocale(translation.locale)
                  ? [{ locale: translation.locale, altText: translation.altText }]
                  : [],
              ),
            }
          : null,
    };
  });
}
