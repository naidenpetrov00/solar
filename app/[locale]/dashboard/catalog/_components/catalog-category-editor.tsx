"use client";

import {
  type ManagedCatalogCategoryDetail,
  type ManagedCatalogCategoryTreeItem,
} from "@/lib/catalog/management-category-types";
import { type CatalogLabels } from "./catalog-labels";
import {
  type EditorSection,
  type LifecycleIntent,
} from "./catalog-editor-model";
import { CategoryEditorHeader } from "./catalog-category-editor-header";
import { PublicationReadiness } from "./catalog-publication-readiness";
import { SpecificationEditor } from "./catalog-specification-editor";
import { useCategoryEditorState } from "./use-category-editor-state";
import { CategoryGeneralSection } from "./catalog-category-general-section";
import { CategoryContentSection } from "./catalog-category-content-section";

export function CategoryEditor({
  detail,
  categories,
  labels,
  locale,
  canManage,
  onDirty,
  clearDirty,
  onMove,
  onLifecycle,
  onReload,
}: {
  detail: ManagedCatalogCategoryDetail;
  categories: ManagedCatalogCategoryTreeItem[];
  labels: CatalogLabels;
  locale: string;
  canManage: boolean;
  onDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
  onMove: () => void;
  onLifecycle: (intent: LifecycleIntent) => void;
  onReload: () => void;
}) {
  const {
    activeLocale,
    setActiveLocale,
    generalResult,
    generalAction,
    generalPending,
    contentResult,
    contentAction,
    contentPending,
    specificationResult,
    specificationAction,
    specificationPending,
    bgSlug,
    setBgSlug,
    enSlug,
    setEnSlug,
    content,
    setContent,
    contentErrors,
    setContentErrors,
    dismissedContentErrors,
    setDismissedContentErrors,
    dismissedGeneralErrors,
    setDismissedGeneralErrors,
  } = useCategoryEditorState(detail, clearDirty);
  const parent = categories.find(({ id }) => id === detail.parentId);

  return (
    <article className="dashboard-catalog-editor">
      <CategoryEditorHeader
        detail={detail}
        labels={labels}
        locale={locale}
        canManage={canManage}
        onLifecycle={onLifecycle}
      />

      <PublicationReadiness
        issues={detail.publicationIssues}
        labels={labels}
        detail={detail}
        activeLocale={activeLocale}
      />

      <CategoryGeneralSection
        detail={detail}
        labels={labels}
        locale={locale}
        canManage={canManage}
        parentName={parent?.name}
        onDirty={onDirty}
        onMove={onMove}
        onReload={onReload}
        generalResult={generalResult}
        generalAction={generalAction}
        generalPending={generalPending}
        bgSlug={bgSlug}
        setBgSlug={setBgSlug}
        enSlug={enSlug}
        setEnSlug={setEnSlug}
        dismissedGeneralErrors={dismissedGeneralErrors}
        setDismissedGeneralErrors={setDismissedGeneralErrors}
      />

      <CategoryContentSection
        detail={detail}
        labels={labels}
        locale={locale}
        canManage={canManage}
        onDirty={onDirty}
        onReload={onReload}
        activeLocale={activeLocale}
        setActiveLocale={setActiveLocale}
        contentResult={contentResult}
        contentAction={contentAction}
        contentPending={contentPending}
        content={content}
        setContent={setContent}
        contentErrors={contentErrors}
        setContentErrors={setContentErrors}
        dismissedContentErrors={dismissedContentErrors}
        setDismissedContentErrors={setDismissedContentErrors}
        bgSlug={bgSlug}
        enSlug={enSlug}
      />

      <details
        id="catalog-category-specifications"
        className="dashboard-catalog-section"
      >
        <summary>{labels.sections.specifications}</summary>
        <SpecificationEditor
          detail={detail}
          labels={labels}
          disabled={!canManage}
          onDirty={() => onDirty("specifications")}
          result={specificationResult}
          action={specificationAction}
          pending={specificationPending}
          onReload={onReload}
          locale={locale}
        />
      </details>
    </article>
  );
}
