import "server-only";

import { cache } from "react";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { catalogCategory, catalogCategoryTranslation } from "@/db/schema";
import {
  catalogCategorySlugForLocale,
  catalogLocales,
  isCatalogLocale,
  type CatalogLocale,
} from "@/lib/catalog/model";
import type { PublicCatalogCategory } from "@/lib/catalog/public-types";

type CategoryRow = typeof catalogCategory.$inferSelect;
type CategoryTranslationRow = typeof catalogCategoryTranslation.$inferSelect;

export type CategoryIndex = {
  rows: CategoryRow[];
  byId: Map<string, CategoryRow>;
  translations: Map<string, Map<CatalogLocale, CategoryTranslationRow>>;
};

export const loadCategoryIndex = cache(async (): Promise<CategoryIndex> => {
  const [rows, translationRows] = await Promise.all([
    db
      .select()
      .from(catalogCategory)
      .where(eq(catalogCategory.status, "published"))
      .orderBy(asc(catalogCategory.sortOrder), asc(catalogCategory.id)),
    db.select().from(catalogCategoryTranslation),
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const translations = new Map<
    string,
    Map<CatalogLocale, CategoryTranslationRow>
  >();

  for (const translation of translationRows) {
    if (
      !byId.has(translation.categoryId) ||
      !isCatalogLocale(translation.locale)
    ) {
      continue;
    }
    const localized = translations.get(translation.categoryId) ?? new Map();
    localized.set(translation.locale, translation);
    translations.set(translation.categoryId, localized);
  }

  return { rows, byId, translations };
});

function hasPublicAncestorChain(index: CategoryIndex, categoryId: string) {
  const seen = new Set<string>();
  let current = index.byId.get(categoryId);

  while (current) {
    if (seen.has(current.id)) return false;
    seen.add(current.id);
    if (current.parentId === null) return true;
    current = index.byId.get(current.parentId);
  }

  return false;
}

function categoryPath(
  index: CategoryIndex,
  categoryId: string,
  locale: CatalogLocale,
) {
  const segments: string[] = [];
  const seen = new Set<string>();
  let current = index.byId.get(categoryId);

  while (current) {
    if (
      seen.has(current.id) ||
      !index.translations.get(current.id)?.has(locale)
    ) {
      return null;
    }
    seen.add(current.id);
    segments.push(catalogCategorySlugForLocale(current, locale));
    if (current.parentId === null) return segments.reverse().join("/");
    current = index.byId.get(current.parentId);
  }

  return null;
}

export function publicCategoryFromRow(
  index: CategoryIndex,
  row: CategoryRow,
  locale: CatalogLocale,
): PublicCatalogCategory | null {
  if (!hasPublicAncestorChain(index, row.id)) return null;
  const translation = index.translations.get(row.id)?.get(locale);
  const path = categoryPath(index, row.id, locale);
  if (!translation || !path) return null;

  const paths = Object.fromEntries(
    catalogLocales.map((candidate) => [
      candidate,
      categoryPath(index, row.id, candidate) ?? "",
    ]),
  ) as Record<CatalogLocale, string>;

  if (catalogLocales.some((candidate) => !paths[candidate])) return null;

  return {
    id: row.id,
    parentId: row.parentId,
    name: translation.name,
    introduction: translation.introduction,
    detailedContent: translation.detailedContent,
    seoTitle: translation.seoTitle,
    metaDescription: translation.metaDescription,
    path,
    paths,
    updatedAt: row.updatedAt,
  };
}
