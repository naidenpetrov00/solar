import { Button } from "@/components/button";
import { DashboardSelect } from "../../_components/dashboard-select";
import type { OrdersLabels } from "../order-labels";
import type { AdjustmentDraft } from "./order-editor-draft";

export function OrderAdjustmentFields({
  id,
  value,
  labels,
  disabled,
  errors,
  onChange,
  onRemove,
}: {
  id: string;
  value: AdjustmentDraft;
  labels: OrdersLabels;
  disabled: boolean;
  errors?: { amount?: boolean; reason?: boolean; direction?: boolean };
  onChange: (next: AdjustmentDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="dashboard-order-adjustment">
      <label>
        <span>{labels.editor.adjustmentDirection}</span>
        <DashboardSelect
          value={value.direction}
          disabled={disabled}
          aria-invalid={errors?.direction || undefined}
          onChange={(event) => onChange({ ...value, direction: event.target.value as AdjustmentDraft["direction"] })}
        >
          <option value="discount">{labels.editor.discount}</option>
          <option value="surcharge">{labels.editor.surcharge}</option>
        </DashboardSelect>
      </label>
      <label htmlFor={`${id}-amount`}>
        <span>{labels.editor.amount}</span>
        <input
          id={`${id}-amount`}
          value={value.amount}
          disabled={disabled}
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors?.amount || undefined}
          aria-describedby={errors?.amount ? `${id}-amount-error` : undefined}
          onChange={(event) => onChange({ ...value, amount: event.target.value })}
        />
        {errors?.amount ? <small id={`${id}-amount-error`} className="dashboard-order-field-error">{labels.editor.invalid}</small> : null}
      </label>
      <label htmlFor={`${id}-reason`}>
        <span>{labels.editor.reason}</span>
        <input
          id={`${id}-reason`}
          value={value.reason}
          disabled={disabled}
          maxLength={500}
          aria-invalid={errors?.reason || undefined}
          aria-describedby={errors?.reason ? `${id}-reason-error` : undefined}
          onChange={(event) => onChange({ ...value, reason: event.target.value })}
        />
        {errors?.reason ? <small id={`${id}-reason-error`} className="dashboard-order-field-error">{labels.editor.required}</small> : null}
      </label>
      <Button type="button" variant="informational" tone="danger" disabled={disabled} onClick={onRemove}>
        {labels.editor.removeAdjustment}
      </Button>
    </div>
  );
}
