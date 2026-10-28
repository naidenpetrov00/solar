import Link from "next/link";

import type { PublicCatalogCategoryNode } from "@/lib/catalog/public-types";
import { localizedPath } from "../_lib/routes";

function CategoryBranch({
  categories,
  currentCategoryId,
  locale,
}: {
  categories: PublicCatalogCategoryNode[];
  currentCategoryId?: string;
  locale: string;
}) {
  return (
    <ul>
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={localizedPath(locale, `shop/${category.path}`)}
            aria-current={category.id === currentCategoryId ? "page" : undefined}
          >
            {category.name}
          </Link>
          {category.children.length > 0 ? (
            <CategoryBranch
              categories={category.children}
              currentCategoryId={currentCategoryId}
              locale={locale}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CatalogCategoryNavigation({
  categories,
  currentCategoryId,
  locale,
  label,
  allProductsLabel,
}: {
  categories: PublicCatalogCategoryNode[];
  currentCategoryId?: string;
  locale: string;
  label: string;
  allProductsLabel: string;
}) {
  return (
    <nav className="catalog-category-navigation" aria-label={label}>
      <Link
        className="catalog-all-products-link"
        href={localizedPath(locale, "shop")}
        aria-current={currentCategoryId ? undefined : "page"}
      >
        {allProductsLabel}
      </Link>
      <CategoryBranch
        categories={categories}
        currentCategoryId={currentCategoryId}
        locale={locale}
      />
    </nav>
  );
}
