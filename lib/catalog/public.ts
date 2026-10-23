import "server-only";

import { cache } from "react";
import { asc, eq, inArray } from "drizzle-orm";

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
} from "@/db/schema";
import {
  catalogCategorySlugForLocale,
  catalogLocales,
  catalogProductSlugForLocale,
  isCatalogLocale,
  publicVatInclusiveMinor,
  type CatalogLocale,
  type CatalogPriceEntryBasis,
  type CatalogProductCustomSpecificationInput,
  type CatalogProductSpecificationConfigurationInput,
} from "@/lib/catalog/model";

export type PublicCatalogMedia = {
  reference: string;
  altText: string;
  isPrimary: boolean;
  isSocialImage: boolean;
};

export type PublicCatalogCategory = {
  id: string;
  parentId: string | null;
  name: string;
  introduction: string;
  detailedContent: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  path: string;
  paths: Record<CatalogLocale, string>;
  updatedAt: Date;
};

export type PublicCatalogProductSummary = {
  id: string;
  slug: string;
  title: string;
  marketingLabel: string | null;
  shortDescription: string;
  salesMode: "direct_purchase" | "enquiry";
  availability: "in_stock" | "out_of_stock" | null;
  price: PublicCatalogPrice | null;
  primaryMedia: PublicCatalogMedia | null;
};

export type PublicCatalogPrice = {
  presentation: "exact" | "from";
  currency: "EUR";
  publicVatInclusiveMinor: string;
  vatRateBasisPoints: number;
};

export type PublicCatalogSpecification = {
  label: string;
  value: string | boolean;
  unit: string | null;
};

export type PublicCatalogProductDetail = PublicCatalogProductSummary & {
  sku: string;
  brand: string | null;
  model: string | null;
  fullDescription: string;
  seoTitle: string | null;
  metaDescription: string | null;
  media: PublicCatalogMedia[];
  specifications: PublicCatalogSpecification[];
  primaryCategory: PublicCatalogCategory;
  additionalCategories: PublicCatalogCategory[];
  paths: Record<CatalogLocale, string>;
  updatedAt: Date;
};

type CategoryRow = typeof catalogCategory.$inferSelect;
type CategoryTranslationRow = typeof catalogCategoryTranslation.$inferSelect;

type CategoryIndex = {
  rows: CategoryRow[];
  byId: Map<string, CategoryRow>;
  translations: Map<string, Map<CatalogLocale, CategoryTranslationRow>>;
};

const loadCategoryIndex = cache(async (): Promise<CategoryIndex> => {
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
    if (!byId.has(translation.categoryId) || !isCatalogLocale(translation.locale)) {
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
    if (seen.has(current.id) || !index.translations.get(current.id)?.has(locale)) {
      return null;
    }
    seen.add(current.id);
    segments.push(catalogCategorySlugForLocale(current, locale));
    if (current.parentId === null) return segments.reverse().join("/");
    current = index.byId.get(current.parentId);
  }

  return null;
}

function publicCategoryFromRow(
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
      if (catalogLocales.some((candidate) => category.paths[candidate] === normalized)) {
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

type ProductRow = typeof catalogProduct.$inferSelect;
type ProductTranslationRow = typeof catalogProductTranslation.$inferSelect;

type ProductIndex = {
  rows: ProductRow[];
  translations: Map<string, Map<CatalogLocale, ProductTranslationRow>>;
  additionalCategoryIds: Map<string, string[]>;
  media: Map<string, PublicCatalogMedia[]>;
};

function isPublicMediaReference(reference: string) {
  if (reference.startsWith("/") && !reference.startsWith("//")) return true;
  try {
    return new URL(reference).protocol === "https:";
  } catch {
    return false;
  }
}

const loadProductIndex = cache(async (): Promise<ProductIndex> => {
  const rows = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.status, "published"));
  const productIds = rows.map(({ id }) => id);
  if (productIds.length === 0) {
    return {
      rows: [],
      translations: new Map(),
      additionalCategoryIds: new Map(),
      media: new Map(),
    };
  }

  const [translationRows, additionalRows, mediaRows] = await Promise.all([
    db
      .select()
      .from(catalogProductTranslation)
      .where(inArray(catalogProductTranslation.productId, productIds)),
    db
      .select()
      .from(catalogProductAdditionalCategory)
      .where(inArray(catalogProductAdditionalCategory.productId, productIds)),
    db
      .select()
      .from(catalogProductMedia)
      .where(inArray(catalogProductMedia.productId, productIds))
      .orderBy(asc(catalogProductMedia.displayOrder), asc(catalogProductMedia.id)),
  ]);
  const mediaIds = mediaRows.map(({ id }) => id);
  const mediaTranslations = mediaIds.length
    ? await db
        .select()
        .from(catalogProductMediaTranslation)
        .where(inArray(catalogProductMediaTranslation.productMediaId, mediaIds))
    : [];
  const translations = new Map<
    string,
    Map<CatalogLocale, ProductTranslationRow>
  >();
  const additionalCategoryIds = new Map<string, string[]>();

  for (const translation of translationRows) {
    if (!isCatalogLocale(translation.locale)) continue;
    const localized = translations.get(translation.productId) ?? new Map();
    localized.set(translation.locale, translation);
    translations.set(translation.productId, localized);
  }
  for (const relation of additionalRows) {
    const ids = additionalCategoryIds.get(relation.productId) ?? [];
    ids.push(relation.categoryId);
    additionalCategoryIds.set(relation.productId, ids);
  }

  const localizedMedia = new Map<string, PublicCatalogMedia[]>();
  for (const productLocale of catalogLocales) {
    for (const mediaRow of mediaRows) {
      if (!isPublicMediaReference(mediaRow.reference)) continue;
      const altText = mediaTranslations.find(
        (translation) =>
          translation.productMediaId === mediaRow.id &&
          translation.locale === productLocale,
      )?.altText;
      if (!altText) continue;
      const key = `${mediaRow.productId}:${productLocale}`;
      const items = localizedMedia.get(key) ?? [];
      items.push({
        reference: mediaRow.reference,
        altText,
        isPrimary: mediaRow.isPrimary,
        isSocialImage: mediaRow.isSocialImage,
      });
      localizedMedia.set(key, items);
    }
  }

  return {
    rows,
    translations,
    additionalCategoryIds,
    media: localizedMedia,
  };
});

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

function publicProductSummary(
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
    return productIndex.rows.flatMap((row) => {
      const assigned =
        row.primaryCategoryId === categoryId ||
        (productIndex.additionalCategoryIds.get(row.id) ?? []).includes(categoryId);
      if (!assigned) return [];
      const summary = publicProductSummary(
        productIndex,
        categoryIndex,
        row,
        locale,
      );
      return summary ? [summary] : [];
    }).sort(
      (left, right) =>
        left.title.localeCompare(right.title, locale) ||
        left.id.localeCompare(right.id),
    );
  },
);

function productPaths(row: ProductRow) {
  return Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      `products/${catalogProductSlugForLocale(row, locale)}`,
    ]),
  ) as Record<CatalogLocale, string>;
}

function customSpecificationValue(
  specification: CatalogProductCustomSpecificationInput,
  locale: CatalogLocale,
): PublicCatalogSpecification | null {
  const label = specification.translations.find(
    (translation) => translation.locale === locale,
  )?.label;
  if (!label || !specification.value) return null;

  if (specification.value.type === "selection") {
    const selectedOptionId = specification.value.optionId;
    const option = specification.options.find(
      ({ id }) => id === selectedOptionId,
    );
    const value = option?.translations.find(
      (translation) => translation.locale === locale,
    )?.label;
    return value ? { label, value, unit: specification.unit ?? null } : null;
  }
  if (specification.value.type === "boolean") {
    return {
      label,
      value: specification.value.value,
      unit: specification.unit ?? null,
    };
  }
  return {
    label,
    value: specification.value.value,
    unit: specification.unit ?? null,
  };
}

async function productSpecifications(
  row: ProductRow,
  locale: CatalogLocale,
): Promise<PublicCatalogSpecification[]> {
  const [specificationRows, valueRows] = await Promise.all([
    db
      .select()
      .from(catalogSpecification)
      .where(eq(catalogSpecification.categoryId, row.primaryCategoryId))
      .orderBy(asc(catalogSpecification.displayOrder), asc(catalogSpecification.id)),
    db
      .select()
      .from(catalogProductSpecificationValue)
      .where(eq(catalogProductSpecificationValue.productId, row.id)),
  ]);
  const specificationIds = specificationRows.map(({ id }) => id);
  const [translationRows, optionRows] = specificationIds.length
    ? await Promise.all([
        db
          .select()
          .from(catalogSpecificationTranslation)
          .where(inArray(catalogSpecificationTranslation.specificationId, specificationIds)),
        db
          .select()
          .from(catalogSpecificationOption)
          .where(inArray(catalogSpecificationOption.specificationId, specificationIds)),
      ])
    : [[], []];
  const optionIds = optionRows.map(({ id }) => id);
  const optionTranslations = optionIds.length
    ? await db
        .select()
        .from(catalogSpecificationOptionTranslation)
        .where(inArray(catalogSpecificationOptionTranslation.optionId, optionIds))
    : [];
  const excluded = new Set(
    (row.specificationConfiguration as CatalogProductSpecificationConfigurationInput)
      .excludedSpecificationIds,
  );
  const values = new Map(valueRows.map((value) => [value.specificationId, value]));
  const result: PublicCatalogSpecification[] = [];

  for (const specification of specificationRows) {
    if (excluded.has(specification.id)) continue;
    const label = translationRows.find(
      (translation) =>
        translation.specificationId === specification.id &&
        translation.locale === locale,
    )?.label;
    const value = values.get(specification.id);
    if (!label || !value) continue;

    if (value.textValue !== null) {
      result.push({ label, value: value.textValue, unit: specification.unit });
    } else if (value.numberValue !== null) {
      result.push({ label, value: value.numberValue, unit: specification.unit });
    } else if (value.booleanValue !== null) {
      result.push({ label, value: value.booleanValue, unit: specification.unit });
    } else if (value.selectionOptionId) {
      const optionLabel = optionTranslations.find(
        (translation) =>
          translation.optionId === value.selectionOptionId &&
          translation.locale === locale,
      )?.label;
      if (optionLabel) result.push({ label, value: optionLabel, unit: specification.unit });
    }
  }

  const configuration =
    row.specificationConfiguration as CatalogProductSpecificationConfigurationInput;
  for (const custom of configuration.customSpecifications.toSorted(
    (left, right) => left.displayOrder - right.displayOrder,
  )) {
    const value = customSpecificationValue(custom, locale);
    if (value) result.push(value);
  }

  return result;
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
            catalogProductSlugForLocale(candidate, candidateLocale) === requestedSlug,
        ),
      );
    if (!row) return null;
    const summary = publicProductSummary(productIndex, categoryIndex, row, locale);
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
      const category = publicCategoryFromRow(categoryIndex, categoryRow, locale);
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
        specifications,
        primaryCategory,
        additionalCategories,
        paths,
        updatedAt: row.updatedAt,
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
    return productIndex.rows.flatMap((row) => {
      if (!requested.has(row.id) || row.salesMode !== "direct_purchase" || row.availability !== "in_stock") {
        return [];
      }
      const summary = publicProductSummary(productIndex, categoryIndex, row, locale);
      if (!summary?.price) return [];
      return [{
        id: summary.id,
        title: summary.title,
        href: `${locale === "bg" ? "" : `/${locale}`}/products/${summary.slug}`,
        priceMinor: summary.price.publicVatInclusiveMinor,
        currency: summary.price.currency,
      }];
    }).sort(
      (left, right) => productIds.indexOf(left.id) - productIds.indexOf(right.id),
    );
  },
);

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
  const productMatch = path.match(/^\/products\/([^/]+)\/?$/u);
  if (productMatch) {
    const source = await resolvePublicProduct(productMatch[1], sourceLocale);
    if (!source) return null;
    const targetPath = source.product.paths[targetLocale];
    const targetSlug = targetPath.replace(/^products\//u, "");
    const target = await resolvePublicProduct(targetSlug, targetLocale);
    return target?.product.id === source.product.id
      ? targetPath
      : null;
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
  const entries: Array<{ path: string; locale: CatalogLocale; updatedAt: Date }> = [];

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
          (productIndex.additionalCategoryIds.get(row.id) ?? []).includes(category.id);
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
      const product = publicProductSummary(productIndex, categoryIndex, row, locale);
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
