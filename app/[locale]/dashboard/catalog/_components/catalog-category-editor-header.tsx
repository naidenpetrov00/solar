import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import type { CatalogLabels } from "./catalog-labels";
import type { LifecycleIntent } from "./catalog-editor-model";
import { DashboardButton } from "./catalog-editor-actions";
export function CategoryEditorHeader({
  detail,
  labels,
  locale,
  canManage,
  onLifecycle,
}: {
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
  locale: string;
  canManage: boolean;
  onLifecycle: (intent: LifecycleIntent) => void;
}) {
  return (
    <header className="dashboard-catalog-editor-header">
      <div>
        <span className="dashboard-catalog-status" data-status={detail.status}>
          {labels.status[detail.status]}
        </span>
        <h2>
          {detail.translations.find(
            (translation) => translation.locale === locale,
          )?.name ||
            detail.translations.find(
              (translation) => translation.locale === "bg",
            )?.name ||
            detail.translations[0]?.name ||
            detail.slug}
        </h2>
        <p>{detail.slug}</p>
      </div>
      {canManage ? (
        <div className="dashboard-catalog-lifecycle-actions">
          {detail.status === "draft" ? (
            <DashboardButton
              type="button"
              onClick={() => onLifecycle("publish")}
            >
              {labels.actions.publish}
            </DashboardButton>
          ) : null}
          {detail.status === "published" ? (
            <DashboardButton
              type="button"
              onClick={() => onLifecycle("unpublish")}
            >
              {labels.actions.unpublish}
            </DashboardButton>
          ) : null}
          {detail.status !== "archived" ? (
            <DashboardButton
              type="button"
              tone="danger"
              onClick={() => onLifecycle("archive")}
            >
              {labels.actions.archive}
            </DashboardButton>
          ) : (
            <DashboardButton
              type="button"
              onClick={() => onLifecycle("restore")}
            >
              {labels.actions.restore}
            </DashboardButton>
          )}
        </div>
      ) : null}
    </header>
  );
}
