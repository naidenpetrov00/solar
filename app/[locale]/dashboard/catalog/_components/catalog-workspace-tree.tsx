import type {
  CatalogWorkspaceProps,
  NewCategorySeed,
} from "./catalog-editor-model";
import type { CatalogLabels } from "./catalog-labels";
import { DashboardButton } from "./catalog-editor-actions";
import { CategoryBranch } from "./catalog-category-tree";

export function CatalogWorkspaceTree({
  categories,
  selectedId,
  newCategory,
  catalogPath,
  labels,
  canManage,
  openCreate,
  reorder,
  onOpen,
  view,
}: {
  categories: CatalogWorkspaceProps["categories"];
  selectedId: string | null;
  newCategory: NewCategorySeed | null;
  catalogPath: string;
  labels: CatalogLabels;
  canManage: boolean;
  openCreate: (parentId: string | null, parentName: string) => void;
  reorder: (categoryId: string, direction: -1 | 1) => void;
  onOpen: () => void;
  view: CatalogWorkspaceProps["view"];
}) {
  return (
    <aside
      className="dashboard-catalog-tree"
      aria-labelledby="catalog-tree-title"
    >
      <div className="dashboard-catalog-tree-heading">
        <h2 id="catalog-tree-title">{labels.tree.title}</h2>
        {canManage ? (
          <DashboardButton
            type="button"
            onClick={() => openCreate(null, labels.create.root)}
          >
            {labels.tree.createRoot}
          </DashboardButton>
        ) : null}
      </div>
      {categories.length === 0 ? (
        <p className="dashboard-catalog-tree-empty">{labels.tree.empty}</p>
      ) : (
        <nav aria-label={labels.tree.title}>
          <CategoryBranch
            parentId={null}
            categories={categories}
            selectedId={newCategory ? null : selectedId}
            catalogPath={catalogPath}
            labels={labels}
            canManage={canManage}
            onCreate={(parentId, name) => openCreate(parentId, name)}
            onReorder={reorder}
            onOpen={onOpen}
            view={view}
          />
        </nav>
      )}
    </aside>
  );
}
