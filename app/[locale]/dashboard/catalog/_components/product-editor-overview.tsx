import { ButtonLink } from "@/components/button";
import type { CatalogLocale } from "@/lib/catalog/model";
import { DashboardButton } from "./product-editor-draft";
import { issueText } from "./product-list";
import type { ProductEditorController } from "./use-product-editor-controller";
export function ProductEditorOverview({
  editor,
}: {
  editor: ProductEditorController;
}) {
  const { props, detail, creating, draft, lifecycle } = editor;
  const { catalogPath, categoryId, labels, locale, canManage } = props;
  const { translations } = draft;
  const openLifecycle = lifecycle.open;
  return (
    <>
      <ButtonLink
        variant="informational"
        href={`${catalogPath}?category=${categoryId}&view=products`}
      >
        {labels.editor.back}
      </ButtonLink>
      <header className="dashboard-catalog-editor-header">
        <div>
          {detail ? (
            <span
              className="dashboard-catalog-status"
              data-status={detail.status}
            >
              {props.statusLabels[detail.status]}
            </span>
          ) : null}
          <h2>
            {creating
              ? labels.editor.newTitle
              : translations[locale as CatalogLocale]?.title ||
                translations.bg.title ||
                labels.list.untitled}
          </h2>
          <p>
            {creating
              ? labels.editor.newDescription
              : labels.editor.editDescription}
          </p>
          {detail ? <small>{detail.sku}</small> : null}
        </div>
        {detail && canManage ? (
          <div className="dashboard-catalog-lifecycle-actions">
            {detail.status === "draft" ? (
              <>
                <DashboardButton
                  type="button"
                  onClick={(event) =>
                    openLifecycle("publish", event.currentTarget)
                  }
                >
                  {labels.actions.publish}
                </DashboardButton>
                <DashboardButton
                  type="button"
                  onClick={(event) =>
                    openLifecycle("archive", event.currentTarget)
                  }
                >
                  {labels.actions.archive}
                </DashboardButton>
              </>
            ) : null}
            {detail.status === "published" ? (
              <>
                <DashboardButton
                  type="button"
                  onClick={(event) =>
                    openLifecycle("unpublish", event.currentTarget)
                  }
                >
                  {labels.actions.unpublish}
                </DashboardButton>
                <DashboardButton
                  type="button"
                  onClick={(event) =>
                    openLifecycle("archive", event.currentTarget)
                  }
                >
                  {labels.actions.archive}
                </DashboardButton>
              </>
            ) : null}
            {detail.status === "archived" ? (
              <DashboardButton
                type="button"
                onClick={(event) =>
                  openLifecycle("restore", event.currentTarget)
                }
              >
                {labels.actions.restore}
              </DashboardButton>
            ) : null}
          </div>
        ) : null}
      </header>
      {!canManage ? (
        <p className="dashboard-catalog-read-only">{labels.editor.readOnly}</p>
      ) : null}
      {detail ? (
        <section
          className="dashboard-catalog-readiness"
          aria-labelledby="product-readiness-title"
        >
          <h3 id="product-readiness-title">{labels.readiness.title}</h3>
          <p>
            {detail.publicationIssues.length === 0
              ? labels.readiness.ready
              : labels.readiness.blocked}
          </p>
          {detail.publicationIssues.length ? (
            <ul>
              {detail.publicationIssues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>
                  {issueText(issue, detail, props)}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
