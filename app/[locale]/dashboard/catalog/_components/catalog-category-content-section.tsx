import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import type { CatalogLabels } from "./catalog-labels";
import type { EditorSection } from "./catalog-editor-model";
import { DashboardButton, contentCompletion } from "./catalog-editor-actions";
import { ResultMessage } from "./catalog-editor-fields";
import { CatalogSectionSaveState } from "./catalog-section-save-state";
import { LocaleContentPanel } from "./catalog-locale-content";
import type { useCategoryEditorState } from "./use-category-editor-state";

type ContentState = Pick<
  ReturnType<typeof useCategoryEditorState>,
  | "activeLocale"
  | "setActiveLocale"
  | "contentResult"
  | "contentAction"
  | "contentPending"
  | "content"
  | "setContent"
  | "contentErrors"
  | "setContentErrors"
  | "dismissedContentErrors"
  | "setDismissedContentErrors"
  | "bgSlug"
  | "enSlug"
>;

export function CategoryContentSection({
  detail,
  labels,
  locale,
  canManage,
  isDirty,
  onDirty,
  onReload,
  activeLocale,
  setActiveLocale,
  contentResult,
  contentAction,
  contentPending,
  content,
  setContent,
  contentErrors,
  setContentErrors,
  dismissedContentErrors,
  setDismissedContentErrors,
  bgSlug,
  enSlug,
}: ContentState & {
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
  locale: string;
  canManage: boolean;
  isDirty: boolean;
  onDirty: (section: EditorSection) => void;
  onReload: () => void;
}) {
  return (
    <details
      className="dashboard-catalog-section"
      data-unsaved={isDirty || undefined}
      open
    >
      <summary>
        {labels.sections.content}
        {isDirty ? (
          <span className="dashboard-catalog-section-unsaved">
            {labels.saveState.unsavedLabel}
          </span>
        ) : null}
      </summary>
      <form
        action={contentAction}
        aria-busy={contentPending}
        onSubmit={(event) => {
          const nextErrors: Record<string, string> = {};
          for (const contentLocale of catalogLocales) {
            if (!content[contentLocale].name.trim()) {
              nextErrors[`content.${contentLocale}.name`] = "REQUIRED";
            }
            if (!content[contentLocale].introduction.trim()) {
              nextErrors[`content.${contentLocale}.introduction`] = "REQUIRED";
            }
          }
          setContentErrors(nextErrors);
          const firstField = Object.keys(nextErrors)[0];
          if (!firstField) return;
          event.preventDefault();
          const [, fieldLocale, fieldName] = firstField.split(".");
          setActiveLocale(fieldLocale as CatalogLocale);
          requestAnimationFrame(() =>
            document
              .getElementById(`catalog-content-${fieldLocale}-${fieldName}`)
              ?.focus(),
          );
        }}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="categoryId" value={detail.id} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={detail.updatedAt}
        />
        <LocalizedEditorSwitch
          idPrefix="catalog-content"
          variant="tabs"
          activeLocale={activeLocale}
          onChange={setActiveLocale}
          languageNames={labels.languages}
          statusByLocale={contentCompletion(content)}
          completeLabel={labels.editor.complete}
          incompleteLabel={labels.editor.incomplete}
          ariaLabel={labels.sections.content}
        />
        {catalogLocales.map((contentLocale) => (
          <LocaleContentPanel
            key={contentLocale}
            locale={contentLocale}
            values={content[contentLocale]}
            labels={labels}
            active={activeLocale === contentLocale}
            disabled={!canManage}
            errors={{
              ...(!dismissedContentErrors
                ? (contentResult.fieldErrors ?? {})
                : {}),
              ...contentErrors,
            }}
            onChange={(values) => {
              setDismissedContentErrors(true);
              setContent((current) => ({
                ...current,
                [contentLocale]: values,
              }));
              setContentErrors((current) => {
                const next = { ...current };
                delete next[`content.${contentLocale}.name`];
                delete next[`content.${contentLocale}.introduction`];
                return next;
              });
              onDirty("content");
            }}
            bgSlug={bgSlug}
            enSlug={enSlug}
            idPrefix="catalog-content"
          />
        ))}
        <CatalogSectionSaveState
          id="catalog-category-content-save-state"
          isDirty={isDirty}
          pending={contentPending}
          result={contentResult}
          copy={labels.saveState}
        />
        {canManage ? (
          <div className="dashboard-catalog-form-actions">
            <span />
            <DashboardButton
              type="submit"
              disabled={!isDirty || contentPending}
              aria-describedby="catalog-category-content-save-state"
            >
              {contentPending ? labels.actions.saving : labels.actions.save}
            </DashboardButton>
          </div>
        ) : null}
        {contentResult.status === "error" ? (
          <ResultMessage
            result={contentResult}
            labels={labels}
            onReload={onReload}
          />
        ) : null}
      </form>
    </details>
  );
}
