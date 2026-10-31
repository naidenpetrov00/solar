import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogManagedAsset,
  catalogProduct,
  catalogProductMedia,
  catalogProductMediaTranslation,
  catalogProductTranslation,
} from "@/db/schema";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { OrderError } from "@/lib/orders/errors";
import type { OrderTransaction } from "@/lib/orders/repository-types";

type ProductRow = typeof catalogProduct.$inferSelect;
type ProductTranslationRow = typeof catalogProductTranslation.$inferSelect;

function isPublicMediaReference(reference: string) {
  if (reference.startsWith("/") && !reference.startsWith("//")) return true;
  try {
    return new URL(reference).protocol === "https:";
  } catch {
    return false;
  }
}

function ancestorChain(
  categories: Map<string, typeof catalogCategory.$inferSelect>,
  categoryId: string,
) {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = categories.get(categoryId);
  while (current) {
    if (seen.has(current.id) || current.status !== "published") return null;
    seen.add(current.id);
    chain.push(current.id);
    if (current.parentId === null) return chain;
    current = categories.get(current.parentId);
  }
  return null;
}

export async function assertPublicOrderEligibility(
  transaction: OrderTransaction,
  input: {
    products: ProductRow[];
    translations: ProductTranslationRow[];
    locale: CatalogLocale;
  },
) {
  const categoryRows = await transaction
    .select()
    .from(catalogCategory)
    .for("share");
  const categories = new Map(categoryRows.map((row) => [row.id, row]));
  const chains = new Map<string, string[]>();
  for (const product of input.products) {
    const chain = ancestorChain(categories, product.primaryCategoryId);
    if (!chain) throw new OrderError("INVALID_INPUT", { productId: product.id });
    chains.set(product.id, chain);
  }
  const categoryIds = [...new Set([...chains.values()].flat())];
  const categoryTranslations = await transaction
    .select()
    .from(catalogCategoryTranslation)
    .where(inArray(catalogCategoryTranslation.categoryId, categoryIds))
    .for("share");
  const categoryLocales = new Map<string, Set<string>>();
  for (const translation of categoryTranslations) {
    const locales = categoryLocales.get(translation.categoryId) ?? new Set();
    locales.add(translation.locale);
    categoryLocales.set(translation.categoryId, locales);
  }
  for (const chain of chains.values()) {
    if (
      chain.some((categoryId) =>
        catalogLocales.some(
          (locale) => !categoryLocales.get(categoryId)?.has(locale),
        ),
      )
    ) {
      throw new OrderError("INVALID_INPUT", { field: "category" });
    }
  }

  const translationsByProduct = new Map(
    input.translations.map((translation) => [
      translation.productId,
      translation,
    ]),
  );
  const productIds = input.products.map(({ id }) => id);
  const primaryMedia = await transaction
    .select()
    .from(catalogProductMedia)
    .where(
      and(
        inArray(catalogProductMedia.productId, productIds),
        eq(catalogProductMedia.isPrimary, true),
      ),
    )
    .for("share");
  const mediaIds = primaryMedia.map(({ id }) => id);
  const mediaTranslations = mediaIds.length
    ? await transaction
        .select()
        .from(catalogProductMediaTranslation)
        .where(
          and(
            inArray(catalogProductMediaTranslation.productMediaId, mediaIds),
            eq(catalogProductMediaTranslation.locale, input.locale),
          ),
        )
        .for("share")
    : [];
  const assetIds = primaryMedia.flatMap(({ assetId }) =>
    assetId ? [assetId] : [],
  );
  const assets = assetIds.length
    ? await transaction
        .select()
        .from(catalogManagedAsset)
        .where(inArray(catalogManagedAsset.id, assetIds))
        .for("share")
    : [];
  const mediaByProduct = new Map(
    primaryMedia.map((media) => [media.productId, media]),
  );
  const translatedMediaIds = new Set(
    mediaTranslations
      .filter((translation) => translation.altText.trim())
      .map((translation) => translation.productMediaId),
  );
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  for (const product of input.products) {
    const translation = translationsByProduct.get(product.id);
    const media = mediaByProduct.get(product.id);
    const asset = media?.assetId ? assetsById.get(media.assetId) : null;
    const validMedia = Boolean(
      media &&
        translatedMediaIds.has(media.id) &&
        (asset
          ? asset.state === "ready"
          : Boolean(
              media.reference && isPublicMediaReference(media.reference),
            )),
    );
    if (
      !translation?.title.trim() ||
      !translation.shortDescription.trim() ||
      !translation.fullDescription.trim() ||
      !validMedia
    ) {
      throw new OrderError("INVALID_INPUT", { productId: product.id });
    }
  }
}
