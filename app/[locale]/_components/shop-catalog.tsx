import { Suspense, type ReactNode } from "react";

import { getT } from "@/i18n.server";
import type {
  PublicCatalogCategory,
  PublicCatalogCategoryNode,
  PublicCatalogListing,
  PublicCatalogSort,
} from "@/lib/catalog/public-types";
import {
  CatalogClearFilters,
  CatalogSortControl,
} from "./catalog-query-controls";
import { ProductList } from "./catalog-product-list";
import { CatalogSidebar } from "./catalog-sidebar";

type BrowseProps = {
  locale: string;
  categories: PublicCatalogCategoryNode[];
  listing: PublicCatalogListing;
  title?: string;
  introduction?: string;
  currentCategory?: PublicCatalogCategory;
  breadcrumbs?: ReactNode;
  detailedContent?: string | null;
};

async function CatalogBrowse({
  locale,
  categories,
  listing,
  title,
  introduction,
  currentCategory,
  breadcrumbs,
  detailedContent,
}: BrowseProps) {
  const { t } = await getT("common", { lng: locale });
  const sortOptions: Record<PublicCatalogSort, string> = {
    "name-asc": t("pages.shop.sortNameAsc"),
    "name-desc": t("pages.shop.sortNameDesc"),
    "price-asc": t("pages.shop.sortPriceAsc"),
    "price-desc": t("pages.shop.sortPriceDesc"),
  };
  const filterLabels = {
    clear: t("pages.shop.clearFilters"),
    minimum: t("pages.shop.minimum"),
    maximum: t("pages.shop.maximum"),
    yes: t("pages.shop.yes"),
    no: t("pages.shop.no"),
    updating: t("pages.shop.updatingResults"),
  };

  return (
    <main id="main-content" className="shop-page">
      <div className="catalog-shell">
        {breadcrumbs}
        <header className="catalog-page-heading">
          <h1>{title ?? t("pages.shop.title")}</h1>
          <p>{introduction ?? t("pages.shop.description")}</p>
        </header>
        <div className="catalog-commerce-layout">
          <CatalogSidebar
            locale={locale}
            categories={categories}
            currentCategoryId={currentCategory?.id}
            facets={listing.facets}
            hasActiveFilters={listing.hasActiveFilters}
            categoriesLabel={t("pages.shop.categories")}
            categoryNavigationLabel={t("pages.shop.categoryNavigation")}
            allProductsLabel={t("pages.shop.allProducts")}
            expandCategoryLabel={t("pages.shop.expandCategory")}
            collapseCategoryLabel={t("pages.shop.collapseCategory")}
            filtersLabel={t("pages.shop.filters")}
            filterLabels={filterLabels}
          />
          <section className="catalog-results" aria-labelledby="catalog-results-title">
            <h2 id="catalog-results-title" className="sr-only">
              {t("pages.shop.products")}
            </h2>
            <div className="catalog-results-toolbar">
              <p role="status">
                {t("pages.shop.resultCount", { count: listing.resultCount })}
              </p>
              <Suspense fallback={null}>
                <CatalogSortControl
                  value={listing.sort}
                  label={t("pages.shop.sortBy")}
                  options={sortOptions}
                  updating={t("pages.shop.updatingResults")}
                />
              </Suspense>
            </div>
            {listing.resultCount > 0 ? (
              <ProductList locale={locale} products={listing.products} />
            ) : (
              <div className="catalog-empty-results">
                <h2>
                  {listing.hasActiveFilters
                    ? t("pages.shop.noMatches")
                    : t(
                        currentCategory
                          ? "pages.shop.emptyProducts"
                          : "pages.shop.emptyCatalog",
                      )}
                </h2>
                {listing.hasActiveFilters ? (
                  <Suspense fallback={null}>
                    <CatalogClearFilters label={t("pages.shop.clearFilters")} />
                  </Suspense>
                ) : null}
              </div>
            )}
            {detailedContent ? (
              <div className="catalog-category-description">{detailedContent}</div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

export function CatalogLanding({
  locale,
  categories,
  listing,
}: {
  locale: string;
  categories: PublicCatalogCategoryNode[];
  listing: PublicCatalogListing;
}) {
  return (
    <CatalogBrowse
      locale={locale}
      categories={categories}
      listing={listing}
    />
  );
}

export function CatalogCategoryView({
  locale,
  categories,
  category,
  listing,
  breadcrumbs,
}: {
  locale: string;
  categories: PublicCatalogCategoryNode[];
  category: PublicCatalogCategory;
  listing: PublicCatalogListing;
  breadcrumbs: ReactNode;
}) {
  return (
    <CatalogBrowse
      locale={locale}
      categories={categories}
      listing={listing}
      title={category.name}
      introduction={category.introduction}
      currentCategory={category}
      breadcrumbs={breadcrumbs}
      detailedContent={category.detailedContent}
    />
  );
}
