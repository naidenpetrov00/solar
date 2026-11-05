import type { Dispatch, RefObject, SetStateAction } from "react";
import type { CatalogActionResult } from "../category-action-model";
import type { CatalogLabels } from "./catalog-labels";
import type { CatalogWorkspaceProps } from "./catalog-editor-model";
import { DashboardButton } from "./catalog-editor-actions";
import { ResultMessage } from "./catalog-editor-fields";
import { DashboardSelect } from "../../_components/dashboard-select";

export function CatalogMoveDialog({
  selected,
  moveDialogRef,
  lastDialogInvokerRef,
  runManagementAction,
  managePending,
  locale,
  labels,
  moveParentId,
  setMoveParentId,
  eligibleParents,
  manageResult,
  reloadLatest,
}: {
  selected: CatalogWorkspaceProps["selected"];
  moveDialogRef: RefObject<HTMLDialogElement | null>;
  lastDialogInvokerRef: RefObject<HTMLElement | null>;
  runManagementAction: (data: FormData) => void;
  managePending: boolean;
  locale: string;
  labels: CatalogLabels;
  moveParentId: string;
  setMoveParentId: Dispatch<SetStateAction<string>>;
  eligibleParents: CatalogWorkspaceProps["categories"];
  manageResult: CatalogActionResult;
  reloadLatest: () => void;
}) {
  return (
    <>
      {selected ? (
        <dialog
          ref={moveDialogRef}
          className="dashboard-catalog-dialog"
          aria-labelledby="catalog-move-title"
          aria-describedby="catalog-move-description"
          onClose={() => lastDialogInvokerRef.current?.focus()}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              runManagementAction(formData);
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
            <input type="hidden" name="intent" value="move" />
            <h2 id="catalog-move-title">{labels.move.title}</h2>
            <p id="catalog-move-description">{labels.move.description}</p>
            <label>
              <span>{labels.move.parent}</span>
              <DashboardSelect
                name="parentId"
                value={moveParentId}
                onChange={(event) => setMoveParentId(event.target.value)}
              >
                <option value="">{labels.move.root}</option>
                {eligibleParents.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </DashboardSelect>
            </label>
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
                onClick={() => moveDialogRef.current?.close()}
              >
                {labels.move.cancel}
              </DashboardButton>
              <DashboardButton type="submit" disabled={managePending}>
                {managePending ? labels.actions.working : labels.move.submit}
              </DashboardButton>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
