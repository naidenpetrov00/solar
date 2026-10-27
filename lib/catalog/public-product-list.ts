import "server-only";

import { cache } from "react";

import {
  catalogProductSlugForLocale,
  type CatalogLocale,
  type CatalogPriceEntryBasis,
} from "@/lib/catalog/model";
import { publicVatInclusiveMinor } from "@/lib/catalog/commerce";
import {
  loadCategoryIndex,
  publicCategoryFromRow,
  type CategoryIndex,
} from "@/lib/catalog/public-category-index";
import {
  loadProductIndex,
  type ProductIndex,
  type ProductRow,
} from "@/lib/catalog/public-product-index";
import type {
  PublicCatalogPrice,
  PublicCatalogProductSummary,
} from "@/lib/catalog/public-types";

function publicPrice(row: ProductRow): PublicCatalogPrice | null {
  if (
    row.pricePresentation === "on_request" ||
    row.priceInputMinor === null ||
    row.priceEntryBasis === null
  ) {
    return null;
  }

  return {
    presentation: row.pricePresentation as "exact" | "from",
    currency: "EUR",
    publicVatInclusiveMinor: publicVatInclusiveMinor({
      presentation: row.pricePresentation as "exact" | "from",
      entryBasis: row.priceEntryBasis as CatalogPriceEntryBasis,
      inputMinor: row.priceInputMinor,
    }).toString(),
    vatRateBasisPoints: row.vatRateBasisPoints,
  };
}

export function publicProductSummary(
  productIndex: ProductIndex,
  categoryIndex: CategoryIndex,
  row: ProductRow,
  locale: CatalogLocale,
): PublicCatalogProductSummary | null {
  const primaryCategory = categoryIndex.byId.get(row.primaryCategoryId);
  if (
    !primaryCategory ||
    !publicCategoryFromRow(categoryIndex, primaryCategory, locale)
  ) {
    return null;
  }
  const translation = productIndex.translations.get(row.id)?.get(locale);
  if (
    !translation?.title.trim() ||
    !translation.shortDescription.trim() ||
    !translation.fullDescription.trim()
  ) {
    return null;
  }
  const media = productIndex.media.get(`${row.id}:${locale}`) ?? [];
  const primaryMedia = media.find(({ isPrimary }) => isPrimary) ?? null;
  if (!primaryMedia) return null;

  return {
    id: row.id,
    slug: catalogProductSlugForLocale(row, locale),
    title: translation.title,
    marketingLabel: translation.marketingLabel,
    shortDescription: translation.shortDescription,
    salesMode: row.salesMode as "direct_purchase" | "enquiry",
    availability: row.availability as "in_stock" | "out_of_stock" | null,
    price: publicPrice(row),
    primaryMedia,
  };
}

export const listPublicProductsForCategory = cache(
  async (
    categoryId: string,
    locale: CatalogLocale,
  ): Promise<PublicCatalogProductSummary[]> => {
    const [productIndex, categoryIndex] = await Promise.all([
      loadProductIndex(),
      loadCategoryIndex(),
    ]);
    return productIndex.rows
      .flatMap((row) => {
        const assigned =
          row.primaryCategoryId === categoryId ||
          (productIndex.additionalCategoryIds.get(row.id) ?? []).includes(
            categoryId,
          );
        if (!assigned) return [];
        const summary = publicProductSummary(
          productIndex,
          categoryIndex,
          row,
          locale,
        );
        return summary ? [summary] : [];
      })
      .sort(
        (left, right) =>
          left.title.localeCompare(right.title, locale) ||
          left.id.localeCompare(right.id),
      );
  },
);
