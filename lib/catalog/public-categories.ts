import "server-only";

import { cache } from "react";

import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import {
  loadCategoryIndex,
  publicCategoryFromRow,
} from "@/lib/catalog/public-category-index";
import type {
  PublicCatalogCategory,
  PublicCatalogCategoryNode,
} from "@/lib/catalog/public-types";

export const listPublicCategoryTree = cache(
  async (locale: CatalogLocale): Promise<PublicCatalogCategoryNode[]> => {
    const index = await loadCategoryIndex();
    const nodes = new Map<string, PublicCatalogCategoryNode>();

    for (const row of index.rows) {
      const category = publicCategoryFromRow(index, row, locale);
      if (category) nodes.set(row.id, { ...category, children: [] });
    }

    const roots: PublicCatalogCategoryNode[] = [];
    for (const row of index.rows) {
      const node = nodes.get(row.id);
      if (!node) continue;
      if (row.parentId === null) {
        roots.push(node);
      } else {
        nodes.get(row.parentId)?.children.push(node);
      }
    }

    return roots;
  },
);

export const listPublicCategoryBranchIds = cache(
  async (categoryId: string, locale: CatalogLocale): Promise<string[]> => {
    const index = await loadCategoryIndex();
    const publicIds = new Set(
      index.rows.flatMap((row) =>
        publicCategoryFromRow(index, row, locale) ? [row.id] : [],
      ),
    );
    if (!publicIds.has(categoryId)) return [];
    const childIds = new Map<string, string[]>();
    for (const row of index.rows) {
      if (!row.parentId || !publicIds.has(row.id)) continue;
      const children = childIds.get(row.parentId) ?? [];
      children.push(row.id);
      childIds.set(row.parentId, children);
    }

    const result: string[] = [];
    const pending = [categoryId];
    while (pending.length > 0) {
      const current = pending.shift();
      if (!current) continue;
      result.push(current);
      pending.push(...(childIds.get(current) ?? []));
    }

    return result;
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
