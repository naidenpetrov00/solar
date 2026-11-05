"use client";

import { catalogLocales } from "@/lib/catalog/model";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import {
  type NewCategorySeed,
  type EditorSection,
} from "./catalog-editor-model";
import { type CatalogLabels } from "./catalog-labels";
import { DashboardButton, contentCompletion } from "./catalog-editor-actions";
import { ResultMessage } from "./catalog-editor-fields";
import { LocaleContentPanel } from "./catalog-locale-content";
import { NewCategoryGeneral } from "./catalog-new-category-general";
import { useNewCategoryDraft } from "./use-new-category-draft";

export function NewCategoryEditor({
  seed,
  labels,
  locale,
  onDirty,
  clearDirty,
  onDiscard,
  onCreated,
}: {
  seed: NewCategorySeed;
  labels: CatalogLabels;
  locale: string;
  onDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
  onDiscard: () => void;
  onCreated: (categoryId: string) => void;
}) {
  const {
    activeLocale,
    setActiveLocale,
    content,
    bgSlug,
    enSlug,
    errors,
    result,
    action,
    pending,
    changeContent,
    changeSlug,
    handleSubmit,
  } = useNewCategoryDraft({ seed, onDirty, clearDirty, onCreated });
  return (
    <article className="dashboard-catalog-editor">
      <header className="dashboard-catalog-editor-header">
        <div>
          <span className="dashboard-catalog-status" data-status="draft">
            {labels.status.draft}
          </span>
          <h2>{labels.create.editorTitle}</h2>
          <p>{labels.create.editorDescription}</p>
        </div>
        <DashboardButton type="button" tone="danger" onClick={onDiscard}>
          {labels.create.discard}
        </DashboardButton>
      </header>

      <form
        action={action}
        aria-busy={pending}
        noValidate
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="parentId" value={seed.parentId ?? ""} />

        <NewCategoryGeneral
          parentName={seed.parentName}
          labels={labels}
          bgSlug={bgSlug}
          enSlug={enSlug}
          errors={errors}
          onSlugChange={changeSlug}
        />

        <section className="dashboard-catalog-create-section">
          <h3>{labels.sections.content}</h3>
          <LocalizedEditorSwitch
            idPrefix="catalog-create-content"
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
              disabled={false}
              errors={errors}
              onChange={(values) => changeContent(contentLocale, values)}
              bgSlug={bgSlug}
              enSlug={enSlug}
              idPrefix="catalog-create-content"
            />
          ))}
        </section>

        <div className="dashboard-catalog-form-actions">
          <DashboardButton type="button" disabled={pending} onClick={onDiscard}>
            {labels.create.discard}
          </DashboardButton>
          <DashboardButton type="submit" disabled={pending}>
            {pending ? labels.create.submitting : labels.create.submit}
          </DashboardButton>
        </div>
        <ResultMessage result={result} labels={labels} />
      </form>
    </article>
  );
}
