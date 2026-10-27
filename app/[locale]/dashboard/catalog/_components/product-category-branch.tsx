import type { ManagedCatalogCategoryTreeItem } from "@/lib/catalog/management-category-types";
import type { ProductLabels } from "./product-labels";
import { categoryDisclosureIcon } from "./product-category-paths";
import { DashboardButton } from "./product-editor-draft";
export function CategoryPickerBranch({
  parentId,
  childrenByParent,
  primaryCategoryId,
  additionalCategoryIds,
  expanded,
  toggleExpanded,
  setPrimary,
  toggleAdditional,
  labels,
  disabled,
}: {
  parentId: string | null;
  childrenByParent: Map<string | null, ManagedCatalogCategoryTreeItem[]>;
  primaryCategoryId: string;
  additionalCategoryIds: string[];
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
  setPrimary: (id: string) => void;
  toggleAdditional: (id: string) => void;
  labels: ProductLabels;
  disabled: boolean;
}) {
  const categories = childrenByParent.get(parentId) ?? [];
  if (categories.length === 0) return null;

  return (
    <ul className="dashboard-catalog-category-tree-list">
      {categories.map((category) => {
        const childCategories = childrenByParent.get(category.id) ?? [];
        const hasChildren = childCategories.length > 0;
        const isExpanded = expanded.has(category.id);
        const primary = category.id === primaryCategoryId;
        const additional = additionalCategoryIds.includes(category.id);
        const childrenId = `catalog-product-category-children-${category.id}`;
        const toggleLabel = (
          isExpanded ? labels.categories.collapse : labels.categories.expand
        ).replace("{{category}}", category.name);

        return (
          <li
            key={category.id}
            className="dashboard-catalog-category-tree-item"
            data-has-children={hasChildren ? "true" : undefined}
          >
            <div
              className="dashboard-catalog-category-picker-row"
              data-primary={primary ? "true" : undefined}
              data-additional={additional ? "true" : undefined}
            >
              <div className="dashboard-catalog-category-node">
                {hasChildren ? (
                  <DashboardButton
                    type="button"
                    className="dashboard-catalog-category-toggle"
                    aria-expanded={isExpanded}
                    aria-controls={childrenId}
                    aria-label={toggleLabel}
                    onClick={() => toggleExpanded(category.id)}
                  >
                    {categoryDisclosureIcon(isExpanded)}
                  </DashboardButton>
                ) : (
                  <span
                    className="dashboard-catalog-category-toggle-spacer"
                    aria-hidden="true"
                  />
                )}
                <span className="dashboard-catalog-category-name">
                  {category.name}
                </span>
              </div>
              <div className="dashboard-catalog-category-actions">
                {primary ? (
                  <strong className="dashboard-catalog-category-role dashboard-catalog-category-role-primary">
                    {labels.categories.primary}
                  </strong>
                ) : (
                  <DashboardButton
                    type="button"
                    className="dashboard-catalog-category-role-action"
                    disabled={disabled || category.status === "archived"}
                    onClick={() => setPrimary(category.id)}
                  >
                    {labels.categories.setPrimary}
                  </DashboardButton>
                )}
                {!primary ? (
                  <DashboardButton
                    type="button"
                    className="dashboard-catalog-category-role-action dashboard-catalog-category-role-additional"
                    disabled={disabled || category.status === "archived"}
                    aria-pressed={additional}
                    onClick={() => toggleAdditional(category.id)}
                  >
                    {additional
                      ? labels.categories.removeAdditional
                      : labels.categories.addAdditional}
                  </DashboardButton>
                ) : null}
              </div>
            </div>
            {hasChildren ? (
              <div
                id={childrenId}
                className="dashboard-catalog-category-children"
                hidden={!isExpanded}
              >
                <CategoryPickerBranch
                  parentId={category.id}
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
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
