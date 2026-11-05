import "server-only";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { catalogCategory } from "@/db/schema";
import { assertUniqueLocales } from "@/lib/catalog/model";
import { type CatalogCategoryTranslationInput } from "@/lib/catalog/catalog-inputs";
import {
  normalizeLongText,
  normalizeOptionalText,
  normalizeRequiredText,
} from "@/lib/catalog/text-validation";
import { type CatalogTransaction } from "@/lib/catalog/actor-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";

function categoryParentPredicate(parentId: string | null) {
  return parentId === null
    ? isNull(catalogCategory.parentId)
    : eq(catalogCategory.parentId, parentId);
}

export async function nextCategorySortOrder(
  transaction: CatalogTransaction,
  parentId: string | null,
  excludedCategoryId?: string,
) {
  const parentPredicate = categoryParentPredicate(parentId);
  const predicate = excludedCategoryId
    ? and(parentPredicate, ne(catalogCategory.id, excludedCategoryId))
    : parentPredicate;
  const [lastSibling] = await transaction
    .select({ sortOrder: catalogCategory.sortOrder })
    .from(catalogCategory)
    .where(predicate)
    .orderBy(desc(catalogCategory.sortOrder), desc(catalogCategory.id))
    .limit(1)
    .for("update");

  return (lastSibling?.sortOrder ?? -1) + 1;
}

export async function assertCategorySlugAvailable(
  transaction: CatalogTransaction,
  parentId: string | null,
  locale: "bg" | "en",
  slug: string,
  excludedCategoryId?: string,
) {
  const column =
    locale === "bg" ? catalogCategory.bgSlug : catalogCategory.enSlug;
  const predicates = [categoryParentPredicate(parentId), eq(column, slug)];

  if (excludedCategoryId) {
    predicates.push(ne(catalogCategory.id, excludedCategoryId));
  }

  const [conflict] = await transaction
    .select({ id: catalogCategory.id })
    .from(catalogCategory)
    .where(and(...predicates))
    .limit(1)
    .for("update");

  if (conflict) {
    throw new CatalogManagementError("SLUG_CONFLICT", { locale });
  }
}

export function categorySlugConstraintLocale(
  error: unknown,
): "bg" | "en" | null {
  if (typeof error !== "object" || error === null) return null;

  const code = "code" in error ? error.code : undefined;
  const constraint = "constraint" in error ? error.constraint : undefined;

  if (code !== "23505" || typeof constraint !== "string") return null;
  if (
    constraint.includes("catalog_category_root_bg_slug") ||
    constraint.includes("catalog_category_sibling_bg_slug")
  )
    return "bg";
  if (
    constraint.includes("catalog_category_root_en_slug") ||
    constraint.includes("catalog_category_sibling_en_slug")
  )
    return "en";
  return null;
}

export function normalizeCategoryTranslations(
  translations: CatalogCategoryTranslationInput[],
) {
  assertUniqueLocales(translations);
  return translations.map((translation) => ({
    locale: translation.locale,
    name: normalizeRequiredText(translation.name, 200),
    introduction: normalizeRequiredText(translation.introduction, 2000),
    detailedContent: normalizeLongText(translation.detailedContent, 50_000),
    seoTitle: normalizeOptionalText(translation.seoTitle, 200),
    metaDescription: normalizeOptionalText(translation.metaDescription, 500),
    productTitleGuidance: normalizeOptionalText(
      translation.productTitleGuidance,
      1000,
    ),
  }));
}
