import "server-only";

import { cache } from "react";

import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import {
  loadCategoryIndex,
  publicCategoryFromRow,
} from "@/lib/catalog/public-category-index";
import type { PublicCatalogCategory } from "@/lib/catalog/public-types";

export const listPublicRootCategories = cache(
  async (locale: CatalogLocale): Promise<PublicCatalogCategory[]> => {
    const index = await loadCategoryIndex();
    return index.rows.flatMap((row) => {
      if (row.parentId !== null) return [];
      const category = publicCategoryFromRow(index, row, locale);
      return category ? [category] : [];
    });
  },
);

export type PublicCategoryResolution = {
  category: PublicCatalogCategory;
  canonical: boolean;
};

export const resolvePublicCategory = cache(
  async (
    requestedPath: string,
    locale: CatalogLocale,
  ): Promise<PublicCategoryResolution | null> => {
    const index = await loadCategoryIndex();
    const normalized = requestedPath.replace(/^\/+|\/+$/gu, "");

    for (const row of index.rows) {
      const category = publicCategoryFromRow(index, row, locale);
      if (!category) continue;
      if (category.path === normalized) return { category, canonical: true };
    }

    for (const row of index.rows) {
      const category = publicCategoryFromRow(index, row, locale);
      if (!category) continue;
      if (
        catalogLocales.some(
          (candidate) => category.paths[candidate] === normalized,
        )
      ) {
        return { category, canonical: false };
      }
    }

    return null;
  },
);

export const listPublicChildCategories = cache(
  async (
    categoryId: string | null,
    locale: CatalogLocale,
  ): Promise<PublicCatalogCategory[]> => {
    const index = await loadCategoryIndex();
    return index.rows.flatMap((row) => {
      if (row.parentId !== categoryId) return [];
      const category = publicCategoryFromRow(index, row, locale);
      return category ? [category] : [];
    });
  },
);

export const listPublicCategoryBreadcrumbs = cache(
  async (
    categoryId: string,
    locale: CatalogLocale,
  ): Promise<PublicCatalogCategory[]> => {
    const index = await loadCategoryIndex();
    const result: PublicCatalogCategory[] = [];
    const seen = new Set<string>();
    let current = index.byId.get(categoryId);

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const category = publicCategoryFromRow(index, current, locale);
      if (!category) return [];
      result.push(category);
      current = current.parentId ? index.byId.get(current.parentId) : undefined;
    }

    return result.reverse();
  },
);
