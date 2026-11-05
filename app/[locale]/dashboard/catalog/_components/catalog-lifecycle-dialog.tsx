import type { RefObject } from "react";
import type { CatalogActionResult } from "../category-action-model";
import type { CatalogLabels } from "./catalog-labels";
import type {
  CatalogWorkspaceProps,
  LifecycleIntent,
} from "./catalog-editor-model";
import { DashboardButton } from "./catalog-editor-actions";
import { ResultMessage } from "./catalog-editor-fields";

export function CatalogLifecycleDialog({
  selected,
  lifecycleIntent,
  lifecycleDialogRef,
  lastDialogInvokerRef,
  runManagementAction,
  managePending,
  locale,
  labels,
  manageResult,
  reloadLatest,
}: {
  selected: CatalogWorkspaceProps["selected"];
  lifecycleIntent: LifecycleIntent | null;
  lifecycleDialogRef: RefObject<HTMLDialogElement | null>;
  lastDialogInvokerRef: RefObject<HTMLElement | null>;
  runManagementAction: (data: FormData) => void;
  managePending: boolean;
  locale: string;
  labels: CatalogLabels;
  manageResult: CatalogActionResult;
  reloadLatest: () => void;
}) {
  return (
    <>
      {selected && lifecycleIntent ? (
        <dialog
          ref={lifecycleDialogRef}
          className="dashboard-catalog-dialog"
          aria-labelledby="catalog-lifecycle-title"
          aria-describedby="catalog-lifecycle-description"
          onClose={() => lastDialogInvokerRef.current?.focus()}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runManagementAction(new FormData(event.currentTarget));
            }}
            aria-busy={managePending}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="categoryId" value={selected.id} />
            <input
              type="hidden"
              name="expectedUpdatedAt"
              value={selected.updatedAt}
            />
            <input type="hidden" name="intent" value={lifecycleIntent} />
            <h2 id="catalog-lifecycle-title">
              {labels.lifecycle[lifecycleIntent].title}
            </h2>
            <p id="catalog-lifecycle-description">
              {labels.lifecycle[lifecycleIntent].description}
            </p>
            {manageResult.status === "error" ? (
              <ResultMessage
                result={manageResult}
                labels={labels}
                onReload={reloadLatest}
              />
            ) : null}
            <div className="dashboard-catalog-dialog-actions">
              <DashboardButton
                type="button"
                disabled={managePending}
                onClick={() => lifecycleDialogRef.current?.close()}
              >
                {labels.lifecycle.cancel}
              </DashboardButton>
              <DashboardButton type="submit" disabled={managePending}>
                {managePending
                  ? labels.actions.working
                  : labels.lifecycle[lifecycleIntent].confirm}
              </DashboardButton>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
