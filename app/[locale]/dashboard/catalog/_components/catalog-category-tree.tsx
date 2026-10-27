"use client";

import Link from "next/link";
import { type ManagedCatalogCategoryTreeItem } from "@/lib/catalog/management-category-types";
import { type CatalogLabels } from "./catalog-labels";
import { DashboardButton, arrowIcon } from "./catalog-editor-actions";

export function CategoryBranch({
  parentId,
  categories,
  selectedId,
  catalogPath,
  labels,
  canManage,
  onCreate,
  onReorder,
  onOpen,
  view,
}: {
  parentId: string | null;
  categories: ManagedCatalogCategoryTreeItem[];
  selectedId: string | null;
  catalogPath: string;
  labels: CatalogLabels;
  canManage: boolean;
  onCreate: (parentId: string, parentName: string) => void;
  onReorder: (categoryId: string, direction: -1 | 1) => void;
  onOpen: () => void;
  view: "category" | "products";
}) {
  const siblings = categories.filter(
    (category) => category.parentId === parentId,
  );

  if (siblings.length === 0) return null;

  return (
    <ul>
      {siblings.map((category, index) => (
        <li key={category.id}>
          <div
            className="dashboard-catalog-tree-row"
            data-selected={selectedId === category.id ? "true" : undefined}
          >
            <Link
              href={`${catalogPath}?category=${category.id}&view=${view}`}
              aria-current={selectedId === category.id ? "page" : undefined}
              onClick={onOpen}
            >
              <strong>{category.name}</strong>
              <span>{category.slug}</span>
              <small>{labels.status[category.status]}</small>
            </Link>
            {canManage ? (
              <div className="dashboard-catalog-tree-actions">
                <DashboardButton
                  type="button"
                  disabled={index === 0}
                  aria-label={`${labels.tree.moveUp}: ${category.name}`}
                  onClick={() => onReorder(category.id, -1)}
                >
                  {arrowIcon("up")}
                </DashboardButton>
                <DashboardButton
                  type="button"
                  disabled={index === siblings.length - 1}
                  aria-label={`${labels.tree.moveDown}: ${category.name}`}
                  onClick={() => onReorder(category.id, 1)}
                >
                  {arrowIcon("down")}
                </DashboardButton>
                {category.status !== "archived" ? (
                  <DashboardButton
                    type="button"
                    onClick={() => onCreate(category.id, category.name)}
                  >
                    {labels.tree.addChild}
                  </DashboardButton>
                ) : null}
              </div>
            ) : null}
          </div>
          <CategoryBranch
            parentId={category.id}
            categories={categories}
            selectedId={selectedId}
            catalogPath={catalogPath}
            labels={labels}
            canManage={canManage}
            onCreate={onCreate}
            onReorder={onReorder}
            onOpen={onOpen}
            view={view}
          />
        </li>
      ))}
    </ul>
  );
}
