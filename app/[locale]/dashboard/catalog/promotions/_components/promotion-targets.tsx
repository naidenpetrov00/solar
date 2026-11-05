import type { ManagedPromotionTarget } from "@/lib/catalog/management-promotion-types";
import type { PromotionLabels } from "./promotion-labels";

function categoryDepth(
  target: ManagedPromotionTarget,
  byId: Map<string, ManagedPromotionTarget>,
) {
  let depth = 0;
  let current = target.parentId ? byId.get(target.parentId) : undefined;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

export function PromotionTargets({
  kind,
  targets,
  selectedIds,
  labels,
  disabled,
  error,
  onToggle,
}: {
  kind: "category" | "product";
  targets: ManagedPromotionTarget[];
  selectedIds: string[];
  labels: PromotionLabels;
  disabled: boolean;
  error?: string;
  onToggle: (id: string, selected: boolean) => void;
}) {
  const byId = new Map(targets.map((target) => [target.id, target]));
  const errorId = `promotion-${kind}-targets-error`;
  return (
    <fieldset
      className="dashboard-promotion-targets"
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
    >
      <legend>
        {kind === "category"
          ? labels.fields.categories.label
          : labels.fields.products.label}
      </legend>
      <p>
        {kind === "category"
          ? labels.fields.categories.help
          : labels.fields.products.help}
      </p>
      <div className="dashboard-promotion-target-list">
        {targets.map((target) => (
          <label
            key={target.id}
            style={
              kind === "category"
                ? { paddingInlineStart: `${categoryDepth(target, byId) * 1.25}rem` }
                : undefined
            }
          >
            <input
              type="checkbox"
              name={kind === "category" ? "categoryIds" : "productIds"}
              value={target.id}
              checked={selectedIds.includes(target.id)}
              onChange={(event) => onToggle(target.id, event.target.checked)}
            />
            <span>
              <strong>{target.name}</strong>
              <small>
                {target.sku ? `${target.sku} · ` : ""}
                {target.salesMode ? labels.salesModes[target.salesMode] : ""}
                {target.salesMode ? " · " : ""}
                {labels.catalogStatuses[target.status]}
              </small>
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="dashboard-catalog-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
