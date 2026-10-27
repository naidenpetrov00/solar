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
} from "@/db/schema";
import {
  catalogLocales,
  isCatalogLocale,
  type CatalogLocale,
} from "@/lib/catalog/model";
import type { PublicCatalogMedia } from "@/lib/catalog/public-types";

export type ProductRow = typeof catalogProduct.$inferSelect;
type ProductTranslationRow = typeof catalogProductTranslation.$inferSelect;

export type ProductIndex = {
  rows: ProductRow[];
  translations: Map<string, Map<CatalogLocale, ProductTranslationRow>>;
  additionalCategoryIds: Map<string, string[]>;
  media: Map<string, PublicCatalogMedia[]>;
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
    };
  }

  const [translationRows, additionalRows, mediaRows] = await Promise.all([
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
  ]);
  const mediaIds = mediaRows.map(({ id }) => id);
  const mediaTranslations = mediaIds.length
    ? await db
        .select()
        .from(catalogProductMediaTranslation)
        .where(inArray(catalogProductMediaTranslation.productMediaId, mediaIds))
    : [];
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
      if (!isPublicMediaReference(mediaRow.reference)) continue;
      const altText = mediaTranslations.find(
        (translation) =>
          translation.productMediaId === mediaRow.id &&
          translation.locale === productLocale,
      )?.altText;
      if (!altText) continue;
      const key = `${mediaRow.productId}:${productLocale}`;
      const items = localizedMedia.get(key) ?? [];
      items.push({
        reference: mediaRow.reference,
        altText,
        isPrimary: mediaRow.isPrimary,
        isSocialImage: mediaRow.isSocialImage,
      });
      localizedMedia.set(key, items);
    }
  }

  return {
    rows,
    translations,
    additionalCategoryIds,
    media: localizedMedia,
  };
});
