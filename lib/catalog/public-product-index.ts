import "server-only";

import { cache } from "react";
import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductMedia,
  catalogProductMediaTranslation,
  catalogProductTranslation,
  catalogManagedAsset,
  catalogProductDocument,
  catalogProductDocumentTranslation,
} from "@/db/schema";
import {
  catalogLocales,
  isCatalogLocale,
  type CatalogLocale,
} from "@/lib/catalog/model";
import type {
  PublicCatalogDocument,
  PublicCatalogMedia,
} from "@/lib/catalog/public-types";
import { catalogAssetStorage } from "@/lib/storage";

export type ProductRow = typeof catalogProduct.$inferSelect;
type ProductTranslationRow = typeof catalogProductTranslation.$inferSelect;

export type ProductIndex = {
  rows: ProductRow[];
  translations: Map<string, Map<CatalogLocale, ProductTranslationRow>>;
  additionalCategoryIds: Map<string, string[]>;
  media: Map<string, PublicCatalogMedia[]>;
  documents: Map<string, PublicCatalogDocument[]>;
};

function isPublicMediaReference(reference: string) {
  if (reference.startsWith("/") && !reference.startsWith("//")) return true;
  try {
    return new URL(reference).protocol === "https:";
  } catch {
    return false;
  }
}

export const loadProductIndex = cache(async (): Promise<ProductIndex> => {
  const rows = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.status, "published"));
  const productIds = rows.map(({ id }) => id);
  if (productIds.length === 0) {
    return {
      rows: [],
      translations: new Map(),
      additionalCategoryIds: new Map(),
      media: new Map(),
      documents: new Map(),
    };
  }

  const [translationRows, additionalRows, mediaRows, documentRows] = await Promise.all([
    db
      .select()
      .from(catalogProductTranslation)
      .where(inArray(catalogProductTranslation.productId, productIds)),
    db
      .select()
      .from(catalogProductAdditionalCategory)
      .where(inArray(catalogProductAdditionalCategory.productId, productIds)),
    db
      .select()
      .from(catalogProductMedia)
      .where(inArray(catalogProductMedia.productId, productIds))
      .orderBy(
        asc(catalogProductMedia.displayOrder),
        asc(catalogProductMedia.id),
      ),
    db
      .select()
      .from(catalogProductDocument)
      .where(inArray(catalogProductDocument.productId, productIds))
      .orderBy(
        asc(catalogProductDocument.displayOrder),
        asc(catalogProductDocument.id),
      ),
  ]);
  const mediaIds = mediaRows.map(({ id }) => id);
  const mediaTranslations = mediaIds.length
    ? await db
        .select()
        .from(catalogProductMediaTranslation)
        .where(inArray(catalogProductMediaTranslation.productMediaId, mediaIds))
    : [];
  const documentIds = documentRows.map(({ id }) => id);
  const documentTranslations = documentIds.length
    ? await db
        .select()
        .from(catalogProductDocumentTranslation)
        .where(inArray(catalogProductDocumentTranslation.documentId, documentIds))
    : [];
  const assetIds = [
    ...mediaRows.flatMap(({ assetId }) => (assetId ? [assetId] : [])),
    ...documentRows.map(({ assetId }) => assetId),
  ];
  const assetRows = assetIds.length
    ? await db
        .select()
        .from(catalogManagedAsset)
        .where(inArray(catalogManagedAsset.id, assetIds))
    : [];
  const assetById = new Map(assetRows.map((asset) => [asset.id, asset]));
  const translations = new Map<
    string,
    Map<CatalogLocale, ProductTranslationRow>
  >();
  const additionalCategoryIds = new Map<string, string[]>();

  for (const translation of translationRows) {
    if (!isCatalogLocale(translation.locale)) continue;
    const localized = translations.get(translation.productId) ?? new Map();
    localized.set(translation.locale, translation);
    translations.set(translation.productId, localized);
  }
  for (const relation of additionalRows) {
    const ids = additionalCategoryIds.get(relation.productId) ?? [];
    ids.push(relation.categoryId);
    additionalCategoryIds.set(relation.productId, ids);
  }

  const localizedMedia = new Map<string, PublicCatalogMedia[]>();
  for (const productLocale of catalogLocales) {
    for (const mediaRow of mediaRows) {
      const asset = mediaRow.assetId ? assetById.get(mediaRow.assetId) : null;
      const reference = asset
        ? asset.state === "ready"
          ? catalogAssetStorage.resolvePublicAssetUrl(asset.objectKey)
          : null
        : mediaRow.reference;
      if (!reference || (!asset && !isPublicMediaReference(reference))) continue;
      const altText = mediaTranslations.find(
        (translation) =>
          translation.productMediaId === mediaRow.id &&
          translation.locale === productLocale,
      )?.altText;
      if (!altText) continue;
      const key = `${mediaRow.productId}:${productLocale}`;
      const items = localizedMedia.get(key) ?? [];
      items.push({
        reference,
        altText,
        isPrimary: mediaRow.isPrimary,
        isSocialImage: mediaRow.isSocialImage,
        source: asset ? "managed" : "legacy",
        width: asset?.width ?? null,
        height: asset?.height ?? null,
      });
      localizedMedia.set(key, items);
    }
  }
  const localizedDocuments = new Map<string, PublicCatalogDocument[]>();
  for (const productLocale of catalogLocales) {
    for (const document of documentRows) {
      const asset = assetById.get(document.assetId);
      const translation = documentTranslations.find(
        (candidate) =>
          candidate.documentId === document.id &&
          candidate.locale === productLocale,
      );
      if (!asset || asset.state !== "ready" || !translation?.title.trim()) continue;
      const key = `${document.productId}:${productLocale}`;
      const items = localizedDocuments.get(key) ?? [];
      items.push({
        url: catalogAssetStorage.resolvePublicAssetUrl(asset.objectKey),
        title: translation.title,
        description: translation.description,
        originalFilename: asset.originalFilename,
        byteSize: asset.byteSize,
      });
      localizedDocuments.set(key, items);
    }
  }

  return {
    rows,
    translations,
    additionalCategoryIds,
    media: localizedMedia,
    documents: localizedDocuments,
  };
});
