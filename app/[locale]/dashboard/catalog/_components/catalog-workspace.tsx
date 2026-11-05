"use client";

import { isCatalogLocale, type CatalogLocale } from "@/lib/catalog/model";
import type { CatalogWorkspaceProps } from "./catalog-editor-model";
import { CatalogWorkspaceTree } from "./catalog-workspace-tree";
import { CatalogWorkspaceDetail } from "./catalog-workspace-detail";
import { CatalogCreateDialog } from "./catalog-create-dialog";
import { CatalogMoveDialog } from "./catalog-move-dialog";
import { CatalogLifecycleDialog } from "./catalog-lifecycle-dialog";
import { useCatalogUnsavedGuard } from "./use-catalog-unsaved-guard";
import { useCatalogManagement } from "./use-catalog-management";
import { useCatalogCreation } from "./use-catalog-creation";

export function CatalogWorkspace(props: CatalogWorkspaceProps) {
  const {
    locale,
    catalogPath,
    categories,
    selected,
    canManage,
    labels,
    openSelectedOnMobile,
    view,
  } = props;
  const {
    dirtySections,
    setDirtySections,
    productDirtySections,
    editorRevision,
    setEditorRevision,
    markDirty,
    clearDirty,
    markProductDirty,
    clearProductDirty,
    clearAllProductDirty,
    confirmDiscard,
  } = useCatalogUnsavedGuard(labels.unsaved.message);
  const {
    moveParentId,
    setMoveParentId,
    lifecycleIntent,
    manageResult,
    managePending,
    moveDialogRef,
    lifecycleDialogRef,
    lastDialogInvokerRef,
    runManagementAction,
    reorder,
    eligibleParents,
    reloadLatest,
    openMove,
    openLifecycle,
  } = useCatalogManagement({
    selected,
    categories,
    locale,
    confirmDiscard,
    setDirtySections,
    setEditorRevision,
  });
  const {
    mobileEditorOpen,
    setMobileEditorOpen,
    createParent,
    createName,
    setCreateName,
    newCategory,
    setNewCategory,
    createDialogRef,
    createContinuedRef,
    openCreate,
    closeEditor,
    handleCreated,
  } = useCatalogCreation({
    selected,
    openSelectedOnMobile,
    rootName: labels.create.root,
    confirmDiscard,
    lastDialogInvokerRef,
    setDirtySections,
    catalogPath,
  });
  const currentLocale: CatalogLocale = isCatalogLocale(locale) ? locale : "bg";
  return (
    <>
      {!canManage ? (
        <p className="dashboard-catalog-readonly">{labels.readOnly}</p>
      ) : null}
      <div
        className="dashboard-catalog-workspace"
        data-mobile-editor={
          (selected || newCategory) && mobileEditorOpen ? "true" : "false"
        }
      >
        <CatalogWorkspaceTree
          categories={categories}
          selectedId={selected?.id ?? null}
          newCategory={newCategory}
          catalogPath={catalogPath}
          labels={labels}
          canManage={canManage}
          openCreate={openCreate}
          reorder={reorder}
          onOpen={() => setMobileEditorOpen(true)}
          view={view}
        />
        <CatalogWorkspaceDetail
          workspace={props}
          newCategory={newCategory}
          editorRevision={editorRevision}
          categoryDirtySections={dirtySections}
          productDirtySections={productDirtySections}
          manageResult={manageResult}
          markDirty={markDirty}
          clearDirty={clearDirty}
          markProductDirty={markProductDirty}
          clearProductDirty={clearProductDirty}
          clearAllProductDirty={clearAllProductDirty}
          confirmDiscard={confirmDiscard}
          onBack={closeEditor}
          onDiscardNew={closeEditor}
          onCreated={handleCreated}
          onMove={openMove}
          onLifecycle={openLifecycle}
          onReload={reloadLatest}
        />
      </div>

      <CatalogCreateDialog
        createDialogRef={createDialogRef}
        createContinuedRef={createContinuedRef}
        lastDialogInvokerRef={lastDialogInvokerRef}
        confirmDiscard={confirmDiscard}
        createName={createName}
        setCreateName={setCreateName}
        createParent={createParent}
        setNewCategory={setNewCategory}
        setDirtySections={setDirtySections}
        setMobileEditorOpen={setMobileEditorOpen}
        currentLocale={currentLocale}
        labels={labels}
        markDirty={markDirty}
        clearDirty={clearDirty}
      />

      <CatalogMoveDialog
        selected={selected}
        moveDialogRef={moveDialogRef}
        lastDialogInvokerRef={lastDialogInvokerRef}
        runManagementAction={runManagementAction}
        managePending={managePending}
        locale={locale}
        labels={labels}
        moveParentId={moveParentId}
        setMoveParentId={setMoveParentId}
        eligibleParents={eligibleParents}
        manageResult={manageResult}
        reloadLatest={reloadLatest}
      />

      <CatalogLifecycleDialog
        selected={selected}
        lifecycleIntent={lifecycleIntent}
        lifecycleDialogRef={lifecycleDialogRef}
        lastDialogInvokerRef={lastDialogInvokerRef}
        runManagementAction={runManagementAction}
        managePending={managePending}
        locale={locale}
        labels={labels}
        manageResult={manageResult}
        reloadLatest={reloadLatest}
      />
    </>
  );
}
