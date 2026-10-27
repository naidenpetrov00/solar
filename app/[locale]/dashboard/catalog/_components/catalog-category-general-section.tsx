import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import type { CatalogLabels } from "./catalog-labels";
import type { EditorSection } from "./catalog-editor-model";
import { DashboardButton, slugErrorLabel } from "./catalog-editor-actions";
import { Field, ResultMessage } from "./catalog-editor-fields";
import type { useCategoryEditorState } from "./use-category-editor-state";

type GeneralState = Pick<
  ReturnType<typeof useCategoryEditorState>,
  | "generalResult"
  | "generalAction"
  | "generalPending"
  | "bgSlug"
  | "setBgSlug"
  | "enSlug"
  | "setEnSlug"
  | "dismissedGeneralErrors"
  | "setDismissedGeneralErrors"
>;

export function CategoryGeneralSection({
  detail,
  labels,
  locale,
  canManage,
  parentName,
  onDirty,
  onMove,
  onReload,
  generalResult,
  generalAction,
  generalPending,
  bgSlug,
  setBgSlug,
  enSlug,
  setEnSlug,
  dismissedGeneralErrors,
  setDismissedGeneralErrors,
}: GeneralState & {
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
  locale: string;
  canManage: boolean;
  parentName?: string;
  onDirty: (section: EditorSection) => void;
  onMove: () => void;
  onReload: () => void;
}) {
  return (
    <details className="dashboard-catalog-section" open>
      <summary>{labels.sections.general}</summary>
      <form action={generalAction} aria-busy={generalPending}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="categoryId" value={detail.id} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={detail.updatedAt}
        />
        <fieldset disabled={!canManage}>
          <div className="dashboard-catalog-slug-grid">
            <Field
              id="catalog-category-bgSlug"
              copy={labels.fields.bgSlug}
              error={
                generalResult.fieldErrors?.bgSlug &&
                !dismissedGeneralErrors.has("bgSlug")
                  ? slugErrorLabel(generalResult.fieldErrors.bgSlug, labels)
                  : undefined
              }
            >
              <input
                id="catalog-category-bgSlug"
                name="bgSlug"
                value={bgSlug}
                onChange={(event) => {
                  setBgSlug(event.target.value);
                  setDismissedGeneralErrors((current) =>
                    new Set(current).add("bgSlug"),
                  );
                  onDirty("general");
                }}
                required
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                readOnly={detail.publishedAt !== null}
                aria-describedby="catalog-category-bgSlug-help"
                aria-invalid={
                  generalResult.fieldErrors?.bgSlug &&
                  !dismissedGeneralErrors.has("bgSlug")
                    ? true
                    : undefined
                }
              />
            </Field>
            <Field
              id="catalog-category-enSlug"
              copy={labels.fields.enSlug}
              error={
                generalResult.fieldErrors?.enSlug &&
                !dismissedGeneralErrors.has("enSlug")
                  ? slugErrorLabel(generalResult.fieldErrors.enSlug, labels)
                  : undefined
              }
            >
              <input
                id="catalog-category-enSlug"
                name="enSlug"
                value={enSlug}
                onChange={(event) => {
                  setEnSlug(event.target.value);
                  setDismissedGeneralErrors((current) =>
                    new Set(current).add("enSlug"),
                  );
                  onDirty("general");
                }}
                required
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                readOnly={detail.publishedAt !== null}
                aria-describedby="catalog-category-enSlug-help"
                aria-invalid={
                  generalResult.fieldErrors?.enSlug &&
                  !dismissedGeneralErrors.has("enSlug")
                    ? true
                    : undefined
                }
              />
            </Field>
          </div>
          <dl className="dashboard-catalog-facts">
            <div>
              <dt>{labels.fields.parent.label}</dt>
              <dd>{parentName ?? labels.move.root}</dd>
            </div>
          </dl>
        </fieldset>
        {canManage ? (
          <div className="dashboard-catalog-form-actions">
            <DashboardButton type="button" onClick={onMove}>
              {labels.actions.move}
            </DashboardButton>
            <DashboardButton type="submit" disabled={generalPending}>
              {generalPending ? labels.actions.saving : labels.actions.save}
            </DashboardButton>
          </div>
        ) : null}
        <ResultMessage
          result={generalResult}
          labels={labels}
          onReload={onReload}
        />
      </form>
    </details>
  );
}
