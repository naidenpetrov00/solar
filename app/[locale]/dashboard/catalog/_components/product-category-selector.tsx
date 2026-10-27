"use client";

import { useEffect, useMemo, useState } from "react";
import type { ManagedCatalogCategoryTreeItem } from "@/lib/catalog/management-category-types";
import type { ProductLabels } from "./product-labels";
import { categoryAncestorIds } from "./product-category-paths";
import { CategoryPickerBranch } from "./product-category-branch";

export function CategorySelector({
  categories,
  primaryCategoryId,
  additionalCategoryIds,
  setPrimary,
  toggleAdditional,
  labels,
  disabled,
  error,
}: {
  categories: ManagedCatalogCategoryTreeItem[];
  primaryCategoryId: string;
  additionalCategoryIds: string[];
  setPrimary: (id: string) => void;
  toggleAdditional: (id: string) => void;
  labels: ProductLabels;
  disabled: boolean;
  error?: string;
}) {
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string | null, ManagedCatalogCategoryTreeItem[]>();
    for (const category of categories) {
      const siblings = grouped.get(category.parentId) ?? [];
      siblings.push(category);
      grouped.set(category.parentId, siblings);
    }
    return grouped;
  }, [categories]);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    categoryAncestorIds(categories, [
      primaryCategoryId,
      ...additionalCategoryIds,
    ]),
  );

  useEffect(() => {
    const requiredAncestors = categoryAncestorIds(categories, [
      primaryCategoryId,
      ...additionalCategoryIds,
    ]);
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setExpanded((current) => {
        const next = new Set(current);
        let changed = false;
        for (const categoryId of requiredAncestors) {
          if (!next.has(categoryId)) {
            next.add(categoryId);
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    return () => {
      active = false;
    };
  }, [categories, primaryCategoryId, additionalCategoryIds]);

  const toggleExpanded = (categoryId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return (
    <details
      id="catalog-product-categories"
      className="dashboard-catalog-product-categories"
      tabIndex={-1}
      open={error ? true : undefined}
    >
      <summary>{labels.categories.title}</summary>
      <div className="dashboard-catalog-product-categories-body">
        <p id="catalog-product-categories-help">{labels.categories.help}</p>
        <div className="dashboard-catalog-category-role-help">
          <p>
            <strong>{labels.categories.primary}</strong>{" "}
            {labels.categories.primaryHelp}
          </p>
          <p>
            <strong>{labels.categories.additional}</strong>{" "}
            {labels.categories.additionalHelp}
          </p>
        </div>
        <div
          className="dashboard-catalog-category-picker"
          role="group"
          aria-label={labels.categories.title}
          aria-describedby={`catalog-product-categories-help${error ? " catalog-product-categories-error" : ""}`}
        >
          <CategoryPickerBranch
            parentId={null}
            childrenByParent={childrenByParent}
            primaryCategoryId={primaryCategoryId}
            additionalCategoryIds={additionalCategoryIds}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            setPrimary={setPrimary}
            toggleAdditional={toggleAdditional}
            labels={labels}
            disabled={disabled}
          />
        </div>
        {error ? (
          <small
            id="catalog-product-categories-error"
            className="dashboard-catalog-field-error"
            role="alert"
          >
            {error}
          </small>
        ) : null}
      </div>
    </details>
  );
}
