import { Button } from "@/components/button";
import { formatCurrencyMinor } from "../../../_lib/catalog-format";
import type { OrdersLabels } from "../order-labels";
import { OrderAdjustmentFields } from "./order-adjustment-fields";
import { newAdjustment, type LineDraft } from "./order-editor-draft";

export function OrderLineEditor({
  line,
  index,
  locale,
  labels,
  disabled,
  fieldErrors,
  canRemove,
  onChange,
  onRemove,
}: {
  line: LineDraft;
  index: number;
  locale: string;
  labels: OrdersLabels;
  disabled: boolean;
  fieldErrors?: Record<string, "REQUIRED" | "INVALID">;
  canRemove: boolean;
  onChange: (next: LineDraft) => void;
  onRemove: () => void;
}) {
  const prefix = `order-line-${line.draftKey}`;
  return (
    <fieldset className="dashboard-order-line" disabled={disabled}>
      <legend>{line.title}</legend>
      <p className="dashboard-order-line-identity">
        <span>{line.sku}</span>
        <span>{formatCurrencyMinor(locale, line.effectiveUnitGrossMinor)}</span>
        {line.promotionLabel ? <span>{line.promotionLabel}</span> : null}
      </p>
      <label htmlFor={`${prefix}-quantity`}>
        <span>{labels.detail.quantity}</span>
        <input
          id={`${prefix}-quantity`}
          value={line.quantity}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-invalid={Boolean(fieldErrors?.[`lines.${index}.quantity`])}
          aria-describedby={fieldErrors?.[`lines.${index}.quantity`] ? `${prefix}-quantity-error` : undefined}
          onChange={(event) => onChange({ ...line, quantity: event.target.value })}
        />
        {fieldErrors?.[`lines.${index}.quantity`] ? <small id={`${prefix}-quantity-error`} className="dashboard-order-field-error">{labels.editor.invalid}</small> : null}
      </label>
      <div className="dashboard-order-line-adjustments">
        <div className="dashboard-order-subheading">
          <h4>{labels.detail.adjustments}</h4>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => onChange({ ...line, adjustments: [...line.adjustments, newAdjustment()] })}
          >
            {labels.editor.addAdjustment}
          </Button>
        </div>
        {line.adjustments.map((adjustment, adjustmentIndex) => (
          <OrderAdjustmentFields
            key={adjustment.draftKey}
            id={`${prefix}-adjustment-${adjustmentIndex}`}
            value={adjustment}
            labels={labels}
            disabled={disabled}
            errors={{
              direction: Boolean(fieldErrors?.[`lines.${index}.adjustments.${adjustmentIndex}.direction`]),
              amount: Boolean(fieldErrors?.[`lines.${index}.adjustments.${adjustmentIndex}.amount`]),
              reason: Boolean(fieldErrors?.[`lines.${index}.adjustments.${adjustmentIndex}.reason`]),
            }}
            onChange={(next) => onChange({
              ...line,
              adjustments: line.adjustments.map((candidate) =>
                candidate.draftKey === adjustment.draftKey ? next : candidate),
            })}
            onRemove={() => onChange({
              ...line,
              adjustments: line.adjustments.filter(
                (candidate) => candidate.draftKey !== adjustment.draftKey,
              ),
            })}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="informational"
        tone="danger"
        disabled={disabled || !canRemove}
        onClick={onRemove}
        aria-label={`${labels.editor.remove}: ${line.title}`}
      >
        {labels.editor.remove}
      </Button>
    </fieldset>
  );
}
