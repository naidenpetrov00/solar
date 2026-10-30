import type { RefObject } from "react";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type { ProductActionResult } from "../product-action-model";
import { DashboardButton } from "./product-editor-draft";
import { ResultMessage } from "./product-editor-fields";
import { CatalogSectionSaveState } from "./catalog-section-save-state";
import type { Props } from "./product-editor-model";
import { issueText } from "./product-list";

export function ProductSaveActions({
  props,
  detail,
  saveResult,
  savePending,
  creating,
  reloadFromServer,
  saveIssuesRef,
  previewTriggerRef,
  setIsPreviewing,
}: {
  props: Props;
  detail: ManagedCatalogProductDetail | null;
  saveResult: ProductActionResult;
  savePending: boolean;
  creating: boolean;
  reloadFromServer: () => void;
  saveIssuesRef: RefObject<HTMLDivElement | null>;
  previewTriggerRef: RefObject<HTMLButtonElement | null>;
  setIsPreviewing: (value: boolean) => void;
}) {
  const { canManage, labels } = props;
  const hasProductChanges =
    props.dirtySections.has("general") ||
    props.dirtySections.has("content") ||
    props.dirtySections.has("specifications");
  return (
    <div className="dashboard-catalog-product-save">
      {canManage ? (
        <ResultMessage
          result={saveResult}
          labels={labels}
          reload={reloadFromServer}
        />
      ) : null}
      {saveResult.publicationIssues?.length && detail ? (
        <div
          ref={saveIssuesRef}
          className="dashboard-catalog-save-issues"
          role="alert"
          tabIndex={-1}
        >
          <ul className="dashboard-catalog-dialog-issues">
            {saveResult.publicationIssues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                {issueText(issue, detail, props)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!creating ? (
        <CatalogSectionSaveState
          id="catalog-product-save-state"
          isDirty={hasProductChanges}
          pending={savePending}
          result={saveResult}
          copy={labels.saveState}
        />
      ) : null}
      <div className="dashboard-catalog-product-save-actions">
        <DashboardButton
          ref={previewTriggerRef}
          type="button"
          className="dashboard-catalog-product-preview-trigger"
          onClick={() => setIsPreviewing(true)}
        >
          {labels.preview.open}
        </DashboardButton>
        {canManage ? (
          <DashboardButton
            type="submit"
            disabled={savePending || (!creating && !hasProductChanges)}
            aria-describedby={creating ? undefined : "catalog-product-save-state"}
          >
            {savePending
              ? creating
                ? labels.actions.creating
                : labels.actions.saving
              : creating
                ? labels.actions.create
                : labels.actions.save}
          </DashboardButton>
        ) : null}
      </div>
    </div>
  );
}
