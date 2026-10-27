import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { catalogCategory, catalogCategoryTranslation } from "@/db/schema";
import {
  catalogCategorySlugForLocale,
  isCatalogLocale,
} from "@/lib/catalog/model";
import { getCatalogActorRole } from "@/lib/catalog/actor-repository";
import { getCategoryPublicationAggregate } from "@/lib/catalog/category-repository";
import { hasPermission } from "@/lib/permission-policy";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  type ManagedCatalogCategoryDetail,
  type ManagedCatalogCategoryTreeItem,
  type ManagedCatalogCategoryWorkspace,
} from "@/lib/catalog/management-category-types";
import {
  catalogCategoryStatus,
  catalogSpecificationValueType,
} from "@/lib/catalog/management-access";
import { getCatalogCategoryPublicationIssues } from "./management-category-readiness";

export async function getManagedCatalogCategoryWorkspace(
  actorId: string,
  requestedLocale: string,
  requestedCategoryId?: string,
): Promise<ManagedCatalogCategoryWorkspace> {
  const role = await getCatalogActorRole(db, actorId);

  if (!hasPermission(role, "catalog:view")) {
    throw new CatalogManagementError("FORBIDDEN");
  }

  const locale = isCatalogLocale(requestedLocale) ? requestedLocale : "bg";
  const [categoryRows, translationRows] = await Promise.all([
    db
      .select()
      .from(catalogCategory)
      .orderBy(
        asc(catalogCategory.parentId),
        asc(catalogCategory.sortOrder),
        asc(catalogCategory.id),
      ),
    db
      .select()
      .from(catalogCategoryTranslation)
      .orderBy(
        asc(catalogCategoryTranslation.categoryId),
        asc(catalogCategoryTranslation.locale),
      ),
  ]);
  const translationsByCategory = new Map<string, typeof translationRows>();

  for (const translation of translationRows) {
    const translations =
      translationsByCategory.get(translation.categoryId) ?? [];
    translations.push(translation);
    translationsByCategory.set(translation.categoryId, translations);
  }

  const categories = categoryRows.map((category) => {
    const translations = translationsByCategory.get(category.id) ?? [];
    const displayTranslation =
      translations.find((translation) => translation.locale === locale) ??
      translations.find((translation) => translation.locale === "bg") ??
      translations[0];

    return {
      id: category.id,
      parentId: category.parentId,
      bgSlug: category.bgSlug,
      enSlug: category.enSlug,
      slug: catalogCategorySlugForLocale(category, locale),
      name:
        displayTranslation?.name ??
        catalogCategorySlugForLocale(category, locale),
      sortOrder: category.sortOrder,
      status: catalogCategoryStatus(category.status),
      updatedAt: category.updatedAt.toISOString(),
    } satisfies ManagedCatalogCategoryTreeItem;
  });
  const selectedId =
    (requestedCategoryId &&
      categories.some(({ id }) => id === requestedCategoryId) &&
      requestedCategoryId) ||
    null;

  if (!selectedId) {
    return {
      canManage: hasPermission(role, "catalog:manage"),
      categories,
      selected: null,
    };
  }

  const aggregate = await getCategoryPublicationAggregate(db, selectedId);

  if (!aggregate) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const specifications = aggregate.specifications
    .toSorted(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.id.localeCompare(right.id),
    )
    .map((specification) => ({
      id: specification.id,
      key: specification.key,
      valueType: catalogSpecificationValueType(specification.valueType),
      unit: specification.unit,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specification.displayOrder,
      translations: aggregate.specificationTranslations.flatMap(
        (translation) =>
          translation.specificationId === specification.id &&
          isCatalogLocale(translation.locale)
            ? [{ locale: translation.locale, label: translation.label }]
            : [],
      ),
      options: aggregate.options
        .filter(({ specificationId }) => specificationId === specification.id)
        .toSorted(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.id.localeCompare(right.id),
        )
        .map((option) => ({
          id: option.id,
          code: option.code,
          displayOrder: option.displayOrder,
          translations: aggregate.optionTranslations.flatMap((translation) =>
            translation.optionId === option.id &&
            isCatalogLocale(translation.locale)
              ? [{ locale: translation.locale, label: translation.label }]
              : [],
          ),
        })),
    }));
  const selected: ManagedCatalogCategoryDetail = {
    id: aggregate.category.id,
    parentId: aggregate.category.parentId,
    bgSlug: aggregate.category.bgSlug,
    enSlug: aggregate.category.enSlug,
    slug: catalogCategorySlugForLocale(aggregate.category, locale),
    sortOrder: aggregate.category.sortOrder,
    status: catalogCategoryStatus(aggregate.category.status),
    publishedAt: aggregate.category.publishedAt?.toISOString() ?? null,
    archivedAt: aggregate.category.archivedAt?.toISOString() ?? null,
    updatedAt: aggregate.category.updatedAt.toISOString(),
    translations: aggregate.translations.flatMap((translation) =>
      isCatalogLocale(translation.locale)
        ? [
            {
              locale: translation.locale,
              name: translation.name,
              introduction: translation.introduction,
              detailedContent: translation.detailedContent,
              seoTitle: translation.seoTitle,
              metaDescription: translation.metaDescription,
              productTitleGuidance: translation.productTitleGuidance,
            },
          ]
        : [],
    ),
    specifications,
    publicationIssues: getCatalogCategoryPublicationIssues(aggregate),
  };

  return {
    canManage: hasPermission(role, "catalog:manage"),
    categories,
    selected,
  };
}
