"use client";

import { type ManagedCatalogCategoryTreeItem } from "@/lib/catalog/management-category-types";
import {
  catalogProductSlugForLocale,
  type CatalogLocale,
} from "@/lib/catalog/model";

export function categoryAncestorIds(
  categories: ManagedCatalogCategoryTreeItem[],
  categoryIds: string[],
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ancestors = new Set<string>();

  for (const categoryId of categoryIds) {
    let parentId = byId.get(categoryId)?.parentId ?? null;
    const seen = new Set<string>();

    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      ancestors.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }

  return ancestors;
}

export function productPublicPath(
  locale: CatalogLocale,
  bgSlug: string,
  enSlug: string,
  trSlug: string | null,
  ukSlug: string | null,
) {
  const localePrefix = locale === "bg" ? "" : `/${locale}`;
  const productSlug = catalogProductSlugForLocale(
    { bgSlug, enSlug, trSlug, ukSlug },
    locale,
  );
  return `${localePrefix}/products/${productSlug}`;
}

export function categoryDisclosureIcon(expanded: boolean) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <path
        d={expanded ? "M5 7.5l5 5 5-5" : "M7.5 5l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
