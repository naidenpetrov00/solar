import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import { DashboardButton } from "./product-editor-draft";
import { ResultMessage } from "./product-editor-fields";
import type { Props } from "./product-editor-model";
import { issueText } from "./product-list";
import type { useProductLifecycle } from "./use-product-lifecycle";

export function ProductLifecycleDialog({
  detail,
  props,
  lifecycle,
  reloadFromServer,
}: {
  detail: ManagedCatalogProductDetail | null;
  props: Props;
  lifecycle: ReturnType<typeof useProductLifecycle>;
  reloadFromServer: () => void;
}) {
  if (!detail) return null;
  const { locale, labels } = props;
  const { result, pending, intent, dialog, invoker, submit } = lifecycle;

  return (
    <dialog
      ref={dialog}
      className="dashboard-catalog-dialog"
      aria-labelledby="product-lifecycle-title"
      onClose={() => invoker.current?.focus()}
    >
      {intent ? (
        <form onSubmit={submit}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="productId" value={detail.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={detail.updatedAt}
          />
          <input type="hidden" name="intent" value={intent} />
          <h2 id="product-lifecycle-title">{labels.lifecycle[intent].title}</h2>
          <p>{labels.lifecycle[intent].description}</p>
          <ResultMessage
            result={result}
            labels={labels}
            reload={reloadFromServer}
          />
          {result.publicationIssues?.length ? (
            <ul className="dashboard-catalog-dialog-issues">
              {result.publicationIssues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>
                  {issueText(issue, detail, props)}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="dashboard-catalog-dialog-actions">
            <DashboardButton
              type="button"
              onClick={() => dialog.current?.close()}
            >
              {labels.actions.cancel}
            </DashboardButton>
            <DashboardButton type="submit" disabled={pending}>
              {pending
                ? labels.actions.working
                : labels.lifecycle[intent].confirm}
            </DashboardButton>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
