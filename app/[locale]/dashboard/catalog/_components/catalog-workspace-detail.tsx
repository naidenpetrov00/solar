import Link from "next/link";
import type { CatalogActionResult } from "../category-action-model";
import type {
  CatalogWorkspaceProps,
  EditorSection,
  LifecycleIntent,
  NewCategorySeed,
} from "./catalog-editor-model";
import type { ProductEditorSection } from "./product-editor-model";
import { DashboardButton, arrowIcon } from "./catalog-editor-actions";
import { NewCategoryEditor } from "./catalog-new-category-editor";
import { ProductWorkspace } from "./product-workspace";
import { CategoryEditor } from "./catalog-category-editor";
import { ResultMessage } from "./catalog-editor-fields";

export function CatalogWorkspaceDetail({
  workspace,
  newCategory,
  editorRevision,
  categoryDirtySections,
  productDirtySections,
  manageResult,
  markDirty,
  clearDirty,
  markProductDirty,
  clearAllProductDirty,
  confirmDiscard,
  onBack,
  onDiscardNew,
  onCreated,
  onMove,
  onLifecycle,
  onReload,
}: {
  workspace: CatalogWorkspaceProps;
  newCategory: NewCategorySeed | null;
  editorRevision: number;
  categoryDirtySections: Set<EditorSection>;
  productDirtySections: Set<ProductEditorSection>;
  manageResult: CatalogActionResult;
  markDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
  markProductDirty: (section: ProductEditorSection) => void;
  clearAllProductDirty: () => void;
  confirmDiscard: () => boolean;
  onBack: () => void;
  onDiscardNew: () => void;
  onCreated: (categoryId: string) => void;
  onMove: () => void;
  onLifecycle: (intent: LifecycleIntent) => void;
  onReload: () => void;
}) {
  const {
    locale,
    catalogPath,
    categories,
    selected,
    canManage,
    labels,
    view,
    requestedProduct,
    productWorkspace,
  } = workspace;
  return (
    <section className="dashboard-catalog-detail">
      <DashboardButton
        type="button"
        className="dashboard-catalog-mobile-back"
        onClick={onBack}
      >
        {arrowIcon("back")}
        {labels.tree.back}
      </DashboardButton>
      {selected && !newCategory ? (
        <nav
          className="dashboard-catalog-view-switch"
          aria-label={labels.product.views.ariaLabel}
        >
          <Link
            href={`${catalogPath}?category=${selected.id}&view=category`}
            aria-current={view === "category" ? "page" : undefined}
          >
            {labels.product.views.category}
          </Link>
          <Link
            href={`${catalogPath}?category=${selected.id}&view=products`}
            aria-current={view === "products" ? "page" : undefined}
          >
            {labels.product.views.products}
          </Link>
        </nav>
      ) : null}
      {newCategory ? (
        <NewCategoryEditor
          key={`${newCategory.parentId ?? "root"}:${editorRevision}`}
          seed={newCategory}
          labels={labels}
          locale={locale}
          onDirty={markDirty}
          clearDirty={clearDirty}
          onDiscard={onDiscardNew}
          onCreated={onCreated}
        />
      ) : selected && view === "products" && productWorkspace ? (
        <ProductWorkspace
          locale={locale}
          catalogPath={catalogPath}
          categoryId={selected.id}
          categories={categories}
          categoryConfigurations={productWorkspace.categoryConfigurations}
          products={productWorkspace.products}
          selectedProduct={productWorkspace.selected}
          requestedProduct={requestedProduct}
          canManage={canManage}
          labels={labels.product}
          languages={labels.languages}
          statusLabels={labels.status}
          dirtySections={productDirtySections}
          onDirty={markProductDirty}
          clearAllDirty={clearAllProductDirty}
          confirmDiscard={confirmDiscard}
        />
      ) : selected ? (
        <CategoryEditor
          key={`${selected.id}:${editorRevision}`}
          detail={selected}
          categories={categories}
          labels={labels}
          locale={locale}
          canManage={canManage}
          dirtySections={categoryDirtySections}
          onDirty={markDirty}
          clearDirty={clearDirty}
          onMove={onMove}
          onLifecycle={onLifecycle}
          onReload={onReload}
        />
      ) : (
        <div className="dashboard-catalog-detail-empty">
          <h2>{labels.editor.emptyTitle}</h2>
          <p>{labels.editor.emptyDescription}</p>
        </div>
      )}
      {manageResult.status === "success" ? (
        <ResultMessage result={manageResult} labels={labels} />
      ) : null}
    </section>
  );
}
