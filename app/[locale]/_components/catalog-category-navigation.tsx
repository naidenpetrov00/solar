"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicCatalogCategoryNode } from "@/lib/catalog/public-types";
import { localizedPath } from "../_lib/routes";

function activeBranch(
  categories: PublicCatalogCategoryNode[],
  currentCategoryId?: string,
): string[] {
  if (!currentCategoryId) return [];
  for (const category of categories) {
    if (category.id === currentCategoryId) return [category.id];
    const childPath = activeBranch(category.children, currentCategoryId);
    if (childPath.length) return [category.id, ...childPath];
  }
  return [];
}

type BranchProps = {
  categories: PublicCatalogCategoryNode[];
  currentCategoryId?: string;
  locale: string;
  openIds: Set<string>;
  toggle: (categoryId: string) => void;
  expandLabel: string;
  collapseLabel: string;
};

function CategoryBranch(props: BranchProps) {
  return (
    <ul>
      {props.categories.map((category) => {
        const isOpen = props.openIds.has(category.id);
        const childrenId = `catalog-category-children-${category.id}`;
        const label = (isOpen
          ? props.collapseLabel
          : props.expandLabel
        ).replace("{{category}}", category.name);

        return (
          <li key={category.id}>
            <div className="catalog-category-navigation-row">
              <Link
                href={localizedPath(props.locale, `shop/${category.path}`)}
                aria-current={
                  category.id === props.currentCategoryId ? "page" : undefined
                }
              >
                {category.name}
              </Link>
              {category.children.length ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={childrenId}
                  aria-label={label}
                  onClick={() => props.toggle(category.id)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path d="m6.5 8 3.5 3.5L13.5 8" />
                  </svg>
                </button>
              ) : null}
            </div>
            {category.children.length ? (
              <div id={childrenId} hidden={!isOpen}>
                <CategoryBranch {...props} categories={category.children} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function CatalogCategoryNavigation({
  categories,
  currentCategoryId,
  locale,
  label,
  allProductsLabel,
  expandLabel,
  collapseLabel,
}: {
  categories: PublicCatalogCategoryNode[];
  currentCategoryId?: string;
  locale: string;
  label: string;
  allProductsLabel: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  const [openIds, setOpenIds] = useState(
    () => new Set(activeBranch(categories, currentCategoryId)),
  );
  const toggle = (categoryId: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

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
        openIds={openIds}
        toggle={toggle}
        expandLabel={expandLabel}
        collapseLabel={collapseLabel}
      />
    </nav>
  );
}
