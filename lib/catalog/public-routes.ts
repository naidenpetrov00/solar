import "server-only";

import { cache } from "react";

import {
  catalogLocales,
  isCatalogLocale,
  type CatalogLocale,
} from "@/lib/catalog/model";
import {
  loadCategoryIndex,
  publicCategoryFromRow,
} from "@/lib/catalog/public-category-index";
import { resolvePublicCategory } from "@/lib/catalog/public-categories";
import { loadProductIndex } from "@/lib/catalog/public-product-index";
import { publicProductSummary } from "@/lib/catalog/public-product-list";
import { resolvePublicProduct } from "@/lib/catalog/public-products";

export async function resolveCatalogLocalePath(
  sourcePath: string,
  targetLocale: CatalogLocale,
) {
  const sourceLocaleMatch = sourcePath.match(/^\/(bg|en|tr|uk)(?=\/|$)/u);
  const sourceLocale =
    sourceLocaleMatch?.[1] && isCatalogLocale(sourceLocaleMatch[1])
      ? sourceLocaleMatch[1]
      : "bg";
  const path = sourcePath.replace(/^\/(?:bg|en|tr|uk)(?=\/|$)/u, "") || "/";
  if (/^\/shop\/?$/u.test(path)) return "shop";
  const productMatch = path.match(/^\/products\/([^/]+)\/?$/u);
  if (productMatch) {
    const source = await resolvePublicProduct(productMatch[1], sourceLocale);
    if (!source) return null;
    const targetPath = source.product.paths[targetLocale];
    const targetSlug = targetPath.replace(/^products\//u, "");
    const target = await resolvePublicProduct(targetSlug, targetLocale);
    return target?.product.id === source.product.id ? targetPath : null;
  }
  const categoryMatch = path.match(/^\/shop\/(.+?)\/?$/u);
  if (categoryMatch) {
    const source = await resolvePublicCategory(categoryMatch[1], sourceLocale);
    if (!source) return null;
    const targetPath = source.category.paths[targetLocale];
    const target = await resolvePublicCategory(targetPath, targetLocale);
    return target?.category.id === source.category.id
      ? `shop/${targetPath}`
      : null;
  }
  return null;
}

export const listPublicSitemapEntries = cache(async () => {
  const [categoryIndex, productIndex] = await Promise.all([
    loadCategoryIndex(),
    loadProductIndex(),
  ]);
  const entries: Array<{
    path: string;
    locale: CatalogLocale;
    updatedAt: Date;
  }> = [];

  for (const locale of catalogLocales) {
    const publicCategories = categoryIndex.rows.flatMap((row) => {
      const category = publicCategoryFromRow(categoryIndex, row, locale);
      return category ? [category] : [];
    });
    for (const category of publicCategories) {
      const hasPublishedChild = publicCategories.some(
        ({ parentId }) => parentId === category.id,
      );
      const hasPublishedProduct = productIndex.rows.some((row) => {
        const assigned =
          row.primaryCategoryId === category.id ||
          (productIndex.additionalCategoryIds.get(row.id) ?? []).includes(
            category.id,
          );
        return Boolean(
          assigned &&
          publicProductSummary(productIndex, categoryIndex, row, locale),
        );
      });
      if (hasPublishedChild || hasPublishedProduct) {
        entries.push({
          path: `shop/${category.path}`,
          locale,
          updatedAt: category.updatedAt,
        });
      }
    }
    for (const row of productIndex.rows) {
      const product = publicProductSummary(
        productIndex,
        categoryIndex,
        row,
        locale,
      );
      if (product) {
        entries.push({
          path: `products/${product.slug}`,
          locale,
          updatedAt: row.updatedAt,
        });
      }
    }
  }

  return entries;
});

export function catalogLocale(value: string): CatalogLocale | null {
  return isCatalogLocale(value) ? value : null;
}
