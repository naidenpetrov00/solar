import "server-only";

import { cache } from "react";

import {
  catalogLocales,
  catalogProductSlugForLocale,
  type CatalogLocale,
} from "@/lib/catalog/model";
import {
  loadCategoryIndex,
  publicCategoryFromRow,
} from "@/lib/catalog/public-category-index";
import {
  loadProductIndex,
  type ProductRow,
} from "@/lib/catalog/public-product-index";
import { publicProductSummary } from "@/lib/catalog/public-product-list";
import { productSpecifications } from "@/lib/catalog/public-product-specifications";
import type { PublicCatalogProductDetail } from "@/lib/catalog/public-types";

function productPaths(row: ProductRow) {
  return Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      `products/${catalogProductSlugForLocale(row, locale)}`,
    ]),
  ) as Record<CatalogLocale, string>;
}

export type PublicProductResolution = {
  product: PublicCatalogProductDetail;
  canonical: boolean;
};

export const resolvePublicProduct = cache(
  async (
    requestedSlug: string,
    locale: CatalogLocale,
  ): Promise<PublicProductResolution | null> => {
    const [productIndex, categoryIndex] = await Promise.all([
      loadProductIndex(),
      loadCategoryIndex(),
    ]);
    const row =
      productIndex.rows.find(
        (candidate) =>
          catalogProductSlugForLocale(candidate, locale) === requestedSlug,
      ) ??
      productIndex.rows.find((candidate) =>
        catalogLocales.some(
          (candidateLocale) =>
            catalogProductSlugForLocale(candidate, candidateLocale) ===
            requestedSlug,
        ),
      );
    if (!row) return null;
    const summary = publicProductSummary(
      productIndex,
      categoryIndex,
      row,
      locale,
    );
    if (!summary) return null;
    const translation = productIndex.translations.get(row.id)?.get(locale);
    const primaryRow = categoryIndex.byId.get(row.primaryCategoryId);
    if (!translation || !primaryRow) return null;
    const primaryCategory = publicCategoryFromRow(
      categoryIndex,
      primaryRow,
      locale,
    );
    if (!primaryCategory) return null;
    const additionalCategories = (
      productIndex.additionalCategoryIds.get(row.id) ?? []
    ).flatMap((categoryId) => {
      const categoryRow = categoryIndex.byId.get(categoryId);
      if (!categoryRow) return [];
      const category = publicCategoryFromRow(
        categoryIndex,
        categoryRow,
        locale,
      );
      return category ? [category] : [];
    });
    const [specifications] = await Promise.all([
      productSpecifications(row, locale),
    ]);
    const paths = productPaths(row);

    return {
      canonical: requestedSlug === summary.slug,
      product: {
        ...summary,
        sku: row.sku,
        brand: row.brand,
        model: row.mpn,
        fullDescription: translation.fullDescription,
        seoTitle: translation.seoTitle,
        metaDescription: translation.metaDescription,
        media: productIndex.media.get(`${row.id}:${locale}`) ?? [],
        documents: productIndex.documents.get(`${row.id}:${locale}`) ?? [],
        specifications,
        primaryCategory,
        additionalCategories,
        paths,
        updatedAt: new Date(
          Math.max(row.updatedAt.getTime(), row.assetsUpdatedAt.getTime()),
        ),
      },
    };
  },
);

export const listPublicCartProducts = cache(
  async (locale: CatalogLocale, productIds: string[]) => {
    const [productIndex, categoryIndex] = await Promise.all([
      loadProductIndex(),
      loadCategoryIndex(),
    ]);
    const requested = new Set(productIds);
    return productIndex.rows
      .flatMap((row) => {
        if (
          !requested.has(row.id) ||
          row.salesMode !== "direct_purchase" ||
          row.availability !== "in_stock"
        ) {
          return [];
        }
        const summary = publicProductSummary(
          productIndex,
          categoryIndex,
          row,
          locale,
        );
        if (!summary?.price) return [];
        return [
          {
            id: summary.id,
            title: summary.title,
            href: `${locale === "bg" ? "" : `/${locale}`}/products/${summary.slug}`,
            priceMinor: summary.price.publicVatInclusiveMinor,
            currency: summary.price.currency,
          },
        ];
      })
      .sort(
        (left, right) =>
          productIds.indexOf(left.id) - productIds.indexOf(right.id),
      );
  },
);
