import "server-only";

import { listPublicCategoryBranchIds } from "@/lib/catalog/public-categories";
import { loadPublicCatalogFacets } from "@/lib/catalog/public-catalog-facets";
import {
  parsePublicCatalogQuery,
  type PublicCatalogSearchParams,
} from "@/lib/catalog/public-catalog-query";
import { loadCategoryIndex } from "@/lib/catalog/public-category-index";
import { publicProductSummary } from "@/lib/catalog/public-product-list";
import {
  loadProductIndex,
  type ProductRow,
} from "@/lib/catalog/public-product-index";
import { loadPublicPromotionPricing } from "@/lib/catalog/public-promotion-pricing";
import type { CatalogLocale } from "@/lib/catalog/model";
import type {
  PublicCatalogFacet,
  PublicCatalogListing,
  PublicCatalogProductSummary,
  PublicCatalogSort,
} from "@/lib/catalog/public-types";

type Candidate = {
  row: ProductRow;
  summary: PublicCatalogProductSummary;
};

function matchesFacet(
  productId: string,
  facet: PublicCatalogFacet,
  productValues: Map<string, Map<string, string>>,
) {
  const selected = facet.options
    .filter(({ selected: isSelected }) => isSelected)
    .map(({ value }) => value);
  const hasRange = facet.selectedMinimum !== null || facet.selectedMaximum !== null;
  if (selected.length === 0 && !hasRange) return true;
  const value = productValues.get(productId)?.get(facet.id);
  if (value === undefined) return false;
  if (selected.length > 0 && !selected.includes(value)) return false;
  if (facet.selectedMinimum !== null && Number(value) < Number(facet.selectedMinimum)) {
    return false;
  }
  if (facet.selectedMaximum !== null && Number(value) > Number(facet.selectedMaximum)) {
    return false;
  }
  return true;
}

function comparePrice(
  left: PublicCatalogProductSummary,
  right: PublicCatalogProductSummary,
  direction: 1 | -1,
) {
  if (!left.price && !right.price) return 0;
  if (!left.price) return 1;
  if (!right.price) return -1;
  const leftPrice = BigInt(left.price.effectiveVatInclusiveMinor);
  const rightPrice = BigInt(right.price.effectiveVatInclusiveMinor);
  return leftPrice === rightPrice ? 0 : leftPrice < rightPrice ? -direction : direction;
}

function sortProducts(
  products: PublicCatalogProductSummary[],
  sort: PublicCatalogSort,
  locale: CatalogLocale,
) {
  return products.toSorted((left, right) => {
    const nameOrder = left.title.localeCompare(right.title, locale);
    let order = nameOrder;
    if (sort === "name-desc") order = -nameOrder;
    if (sort === "price-asc") order = comparePrice(left, right, 1);
    if (sort === "price-desc") order = comparePrice(left, right, -1);
    return order || nameOrder || left.id.localeCompare(right.id);
  });
}

export async function getPublicCatalogListing({
  categoryId,
  locale,
  searchParams,
}: {
  categoryId?: string;
  locale: CatalogLocale;
  searchParams: PublicCatalogSearchParams;
}): Promise<PublicCatalogListing> {
  const [productIndex, categoryIndex, categoryIds, pricing] = await Promise.all([
    loadProductIndex(),
    loadCategoryIndex(),
    categoryId ? listPublicCategoryBranchIds(categoryId, locale) : null,
    loadPublicPromotionPricing(),
  ]);
  const includedCategories = categoryIds ? new Set(categoryIds) : null;
  const candidates = productIndex.rows.flatMap((row): Candidate[] => {
    const assignedCategories = [
      row.primaryCategoryId,
      ...(productIndex.additionalCategoryIds.get(row.id) ?? []),
    ];
    if (
      includedCategories &&
      !assignedCategories.some((id) => includedCategories.has(id))
    ) {
      return [];
    }
    const summary = publicProductSummary(
      productIndex,
      categoryIndex,
      row,
      locale,
      pricing,
    );
    return summary ? [{ row, summary }] : [];
  });
  const query = parsePublicCatalogQuery(searchParams);
  const { facets, productValues } = await loadPublicCatalogFacets(
    candidates.map(({ row }) => row),
    categoryIndex,
    locale,
    query,
  );
  const activeFacets = facets.filter(
    (facet) =>
      facet.options.some(({ selected }) => selected) ||
      facet.selectedMinimum !== null ||
      facet.selectedMaximum !== null,
  );
  const products = candidates
    .filter(({ row }) =>
      activeFacets.every((facet) => matchesFacet(row.id, facet, productValues)),
    )
    .map(({ summary }) => summary);

  return {
    products: sortProducts(products, query.sort, locale),
    facets,
    totalCount: candidates.length,
    resultCount: products.length,
    sort: query.sort,
    hasActiveFilters: activeFacets.length > 0,
  };
}
