import type { CatalogLabels } from "./catalog-labels";
import type { SpecificationDraft } from "./catalog-editor-model";
import { DashboardButton, arrowIcon } from "./catalog-editor-actions";

export function SpecificationItemHeader({
  specification,
  index,
  specificationsLength,
  isExpanded,
  displayName,
  labels,
  disabled,
  panelId,
  toggleExpanded,
  move,
  onRemove,
}: {
  specification: SpecificationDraft;
  index: number;
  specificationsLength: number;
  isExpanded: boolean;
  displayName: string;
  labels: CatalogLabels;
  disabled: boolean;
  panelId: string;
  toggleExpanded: (clientId: string) => void;
  move: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="dashboard-catalog-specification-header">
      <DashboardButton
        type="button"
        className="dashboard-catalog-specification-toggle"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        aria-label={`${isExpanded ? labels.specifications.collapse : labels.specifications.expand}: ${displayName}`}
        onClick={() => toggleExpanded(specification.clientId)}
      >
        <span className="dashboard-catalog-specification-chevron">
          {arrowIcon(isExpanded ? "up" : "down")}
        </span>
        <span>
          <strong>{displayName}</strong>
          <small>
            {labels.specifications.types[specification.valueType]}
            {specification.valueType === "number" && specification.unit.trim()
              ? ` · ${specification.unit.trim()}`
              : ""}
          </small>
        </span>
      </DashboardButton>
      {!disabled ? (
        <div className="dashboard-catalog-item-controls">
          <DashboardButton
            type="button"
            disabled={index === 0}
            aria-label={labels.specifications.moveUp}
            onClick={() => move(index, -1)}
          >
            {arrowIcon("up")}
          </DashboardButton>
          <DashboardButton
            type="button"
            disabled={index === specificationsLength - 1}
            aria-label={labels.specifications.moveDown}
            onClick={() => move(index, 1)}
          >
            {arrowIcon("down")}
          </DashboardButton>
          <DashboardButton
            type="button"
            onClick={() => {
              if (!window.confirm(labels.specifications.confirmRemove)) return;
              onRemove(index);
            }}
          >
            {labels.specifications.remove}
          </DashboardButton>
        </div>
      ) : null}
    </div>
  );
}
