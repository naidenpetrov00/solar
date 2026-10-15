import "server-only";

import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductMedia,
  catalogProductMediaTranslation,
  catalogProductSpecificationValue,
  catalogProductTranslation,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
  user,
} from "@/db/schema";
import {
  isCatalogLocale,
  publicVatInclusiveMinor,
  type CatalogLocale,
  type CatalogPriceEntryBasis,
} from "@/lib/catalog/model";

export type CatalogTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export type CatalogExecutor = typeof db | CatalogTransaction;

export async function getCatalogActorRole(
  executor: CatalogExecutor,
  actorId: string,
  lock = false,
) {
  const query = executor
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  const rows = lock ? await query.for("update") : await query;
  return rows[0]?.role ?? null;
}

export async function lockCatalogCategory(
  transaction: CatalogTransaction,
  categoryId: string,
) {
  const [category] = await transaction
    .select()
    .from(catalogCategory)
    .where(eq(catalogCategory.id, categoryId))
    .limit(1)
    .for("update");
  return category ?? null;
}

export async function lockCatalogProduct(
  transaction: CatalogTransaction,
  productId: string,
) {
  const [product] = await transaction
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, productId))
    .limit(1)
    .for("update");
  return product ?? null;
}

export async function getCategoryParentRows(
  executor: CatalogExecutor,
  categoryIds: string[],
) {
  if (categoryIds.length === 0) {
    return [];
  }

  return executor
    .select({
      id: catalogCategory.id,
      parentId: catalogCategory.parentId,
      status: catalogCategory.status,
    })
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, categoryIds));
}

export async function getCategoryPublicationAggregate(
  executor: CatalogExecutor,
  categoryId: string,
) {
  const [category] = await executor
    .select()
    .from(catalogCategory)
    .where(eq(catalogCategory.id, categoryId))
    .limit(1);

  if (!category) {
    return null;
  }

  const [translations, specifications] = await Promise.all([
    executor
      .select()
      .from(catalogCategoryTranslation)
      .where(eq(catalogCategoryTranslation.categoryId, categoryId)),
    executor
      .select()
      .from(catalogSpecification)
      .where(eq(catalogSpecification.categoryId, categoryId)),
  ]);
  const specificationIds = specifications.map(({ id }) => id);
  const specificationTranslations = specificationIds.length
    ? await executor
        .select()
        .from(catalogSpecificationTranslation)
        .where(
          inArray(
            catalogSpecificationTranslation.specificationId,
            specificationIds,
          ),
        )
    : [];
  const options = specificationIds.length
    ? await executor
        .select()
        .from(catalogSpecificationOption)
        .where(
          inArray(catalogSpecificationOption.specificationId, specificationIds),
        )
    : [];
  const optionIds = options.map(({ id }) => id);
  const optionTranslations = optionIds.length
    ? await executor
        .select()
        .from(catalogSpecificationOptionTranslation)
        .where(
          inArray(catalogSpecificationOptionTranslation.optionId, optionIds),
        )
    : [];
  const [parent] = category.parentId
    ? await executor
        .select({ id: catalogCategory.id, status: catalogCategory.status })
        .from(catalogCategory)
        .where(eq(catalogCategory.id, category.parentId))
        .limit(1)
    : [];

  return {
    category,
    parent: parent ?? null,
    translations,
    specifications,
    specificationTranslations,
    options,
    optionTranslations,
  };
}

export async function getProductPublicationAggregate(
  executor: CatalogExecutor,
  productId: string,
) {
  const [product] = await executor
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, productId))
    .limit(1);

  if (!product) {
    return null;
  }

  const [translations, additionalCategories, specificationValues, media] =
    await Promise.all([
      executor
        .select()
        .from(catalogProductTranslation)
        .where(eq(catalogProductTranslation.productId, productId)),
      executor
        .select()
        .from(catalogProductAdditionalCategory)
        .where(eq(catalogProductAdditionalCategory.productId, productId)),
      executor
        .select()
        .from(catalogProductSpecificationValue)
        .where(eq(catalogProductSpecificationValue.productId, productId)),
      executor
        .select()
        .from(catalogProductMedia)
        .where(eq(catalogProductMedia.productId, productId)),
    ]);
  const categoryIds = [
    product.primaryCategoryId,
    ...additionalCategories.map(({ categoryId }) => categoryId),
  ];
  const categories = await executor
    .select({ id: catalogCategory.id, status: catalogCategory.status })
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, categoryIds));
  const specifications = await executor
    .select()
    .from(catalogSpecification)
    .where(eq(catalogSpecification.categoryId, product.primaryCategoryId));
  const optionIds = specificationValues.flatMap(({ selectionOptionId }) =>
    selectionOptionId ? [selectionOptionId] : [],
  );
  const selectedOptions = optionIds.length
    ? await executor
        .select({
          id: catalogSpecificationOption.id,
          specificationId: catalogSpecificationOption.specificationId,
        })
        .from(catalogSpecificationOption)
        .where(inArray(catalogSpecificationOption.id, optionIds))
    : [];
  const mediaIds = media.map(({ id }) => id);
  const mediaTranslations = mediaIds.length
    ? await executor
        .select()
        .from(catalogProductMediaTranslation)
        .where(inArray(catalogProductMediaTranslation.productMediaId, mediaIds))
    : [];

  return {
    product,
    translations,
    additionalCategories,
    categories,
    specifications,
    specificationValues,
    selectedOptions,
    media,
    mediaTranslations,
  };
}

export type PublishedCategorySummary = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  introduction: string;
};

export async function listPublishedCategorySummaries(
  locale: CatalogLocale,
  parentId: string | null,
): Promise<PublishedCategorySummary[]> {
  if (!isCatalogLocale(locale)) {
    return [];
  }

  const categories = await db
    .select({
      id: catalogCategory.id,
      parentId: catalogCategory.parentId,
      slug: catalogCategory.slug,
      sortOrder: catalogCategory.sortOrder,
    })
    .from(catalogCategory)
    .where(
      and(
        eq(catalogCategory.status, "published"),
        parentId === null
          ? isNull(catalogCategory.parentId)
          : eq(catalogCategory.parentId, parentId),
      ),
    )
    .orderBy(asc(catalogCategory.sortOrder), asc(catalogCategory.id));

  if (categories.length === 0) {
    return [];
  }

  const translations = await db
    .select()
    .from(catalogCategoryTranslation)
    .where(
      and(
        inArray(
          catalogCategoryTranslation.categoryId,
          categories.map(({ id }) => id),
        ),
        or(
          eq(catalogCategoryTranslation.locale, locale),
          eq(catalogCategoryTranslation.locale, "bg"),
        ),
      ),
    );
  const translationByCategory = new Map<
    string,
    Partial<Record<CatalogLocale, (typeof translations)[number]>>
  >();

  for (const translation of translations) {
    const existing = translationByCategory.get(translation.categoryId) ?? {};
    existing[translation.locale as CatalogLocale] = translation;
    translationByCategory.set(translation.categoryId, existing);
  }

  return categories
    .flatMap((category) => {
      const available = translationByCategory.get(category.id);
      const translation = available?.[locale] ?? available?.bg;

      return translation
        ? [{
            id: category.id,
            parentId: category.parentId,
            slug: category.slug,
            name: translation.name,
            introduction: translation.introduction,
            sortOrder: category.sortOrder,
          }]
        : [];
    })
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, locale) ||
        left.id.localeCompare(right.id),
    )
    .map((category) => ({
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      name: category.name,
      introduction: category.introduction,
    }));
}

export type PublishedProductDetail = {
  id: string;
  sku: string;
  slug: string;
  brand: string | null;
  title: string;
  shortDescription: string;
  fullDescription: string;
  marketingLabel: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  salesMode: string;
  availability: string | null;
  price: null | {
    presentation: string;
    currency: "EUR";
    inputMinor: string;
    publicVatInclusiveMinor: string;
  };
};

export async function getPublishedProductBySlug(
  slug: string,
  locale: CatalogLocale,
): Promise<PublishedProductDetail | null> {
  if (!isCatalogLocale(locale)) {
    return null;
  }

  const [row] = await db
    .select({
      id: catalogProduct.id,
      sku: catalogProduct.sku,
      slug: catalogProduct.slug,
      brand: catalogProduct.brand,
      salesMode: catalogProduct.salesMode,
      availability: catalogProduct.availability,
      currency: catalogProduct.currency,
      pricePresentation: catalogProduct.pricePresentation,
      priceEntryBasis: catalogProduct.priceEntryBasis,
      priceInputMinor: catalogProduct.priceInputMinor,
      title: catalogProductTranslation.title,
      shortDescription: catalogProductTranslation.shortDescription,
      fullDescription: catalogProductTranslation.fullDescription,
      marketingLabel: catalogProductTranslation.marketingLabel,
      seoTitle: catalogProductTranslation.seoTitle,
      metaDescription: catalogProductTranslation.metaDescription,
    })
    .from(catalogProduct)
    .innerJoin(
      catalogCategory,
      eq(catalogCategory.id, catalogProduct.primaryCategoryId),
    )
    .innerJoin(
      catalogProductTranslation,
      and(
        eq(catalogProductTranslation.productId, catalogProduct.id),
        eq(catalogProductTranslation.locale, locale),
      ),
    )
    .where(
      and(
        eq(catalogProduct.slug, slug),
        eq(catalogProduct.status, "published"),
        eq(catalogCategory.status, "published"),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const price =
    row.pricePresentation === "on_request" ||
    row.priceInputMinor === null ||
    row.priceEntryBasis === null
      ? null
      : {
          presentation: row.pricePresentation,
          currency: "EUR" as const,
          inputMinor: row.priceInputMinor.toString(),
          publicVatInclusiveMinor: publicVatInclusiveMinor({
            presentation: row.pricePresentation as "exact" | "from",
            entryBasis: row.priceEntryBasis as CatalogPriceEntryBasis,
            inputMinor: row.priceInputMinor,
          }).toString(),
        };

  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    brand: row.brand,
    title: row.title,
    shortDescription: row.shortDescription,
    fullDescription: row.fullDescription,
    marketingLabel: row.marketingLabel,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
    salesMode: row.salesMode,
    availability: row.availability,
    price,
  };
}
