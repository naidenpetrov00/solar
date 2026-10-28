import { Suspense } from "react";

import type {
  PublicCatalogCategoryNode,
  PublicCatalogFacet,
} from "@/lib/catalog/public-types";
import { CatalogCategoryNavigation } from "./catalog-category-navigation";
import {
  CatalogFilterControls,
  type FilterLabels,
} from "./catalog-query-controls";

type Props = {
  locale: string;
  categories: PublicCatalogCategoryNode[];
  currentCategoryId?: string;
  facets: PublicCatalogFacet[];
  hasActiveFilters: boolean;
  categoriesLabel: string;
  categoryNavigationLabel: string;
  allProductsLabel: string;
  filtersLabel: string;
  filterLabels: FilterLabels;
};

function CategoryPanel(props: Props) {
  return (
    <div className="catalog-sidebar-panel">
      <h2>{props.categoriesLabel}</h2>
      <CatalogCategoryNavigation
        categories={props.categories}
        currentCategoryId={props.currentCategoryId}
        locale={props.locale}
        label={props.categoryNavigationLabel}
        allProductsLabel={props.allProductsLabel}
      />
    </div>
  );
}

function FilterPanel(props: Props) {
  if (props.facets.length === 0) return null;
  return (
    <div className="catalog-sidebar-panel">
      <h2>{props.filtersLabel}</h2>
      <Suspense fallback={null}>
        <CatalogFilterControls
          facets={props.facets}
          labels={props.filterLabels}
          showClear={props.hasActiveFilters}
        />
      </Suspense>
    </div>
  );
}

export function CatalogSidebar(props: Props) {
  return (
    <aside className="catalog-sidebar">
      <div className="catalog-sidebar-desktop">
        <section className="catalog-sidebar-section">
          <CategoryPanel {...props} />
        </section>
        {props.facets.length > 0 ? (
          <section className="catalog-sidebar-section">
            <FilterPanel {...props} />
          </section>
        ) : null}
      </div>
      <div className="catalog-sidebar-mobile">
        <details className="catalog-sidebar-section">
          <summary>{props.categoriesLabel}</summary>
          <CategoryPanel {...props} />
        </details>
        {props.facets.length > 0 ? (
          <details className="catalog-sidebar-section">
            <summary>{props.filtersLabel}</summary>
            <FilterPanel {...props} />
          </details>
        ) : null}
      </div>
    </aside>
  );
}
