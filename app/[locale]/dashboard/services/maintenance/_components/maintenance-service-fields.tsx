"use client";

import type { ManagedMaintenanceService } from "@/lib/maintenance/model";
import { MAINTENANCE_PRICE_INPUT_MAX_LENGTH } from "@/lib/maintenance/validation";
import type { MaintenanceLabels } from "./maintenance-labels";

export type MaintenanceServiceDraft = Omit<
  ManagedMaintenanceService,
  "oneTimePriceCents" | "periodicPriceCents"
> & {
  oneTimePrice: string;
  periodicPrice: string;
};

type FieldError = (key: string) => string | null;

export function MaintenanceToggleFields({
  draft,
  labels,
  idPrefix,
  fieldError,
  onChange,
}: {
  draft: MaintenanceServiceDraft;
  labels: MaintenanceLabels;
  idPrefix: string;
  fieldError: FieldError;
  onChange: (
    field: "isActive" | "oneTimeAvailable" | "periodicAvailable",
    value: boolean,
  ) => void;
}) {
  const frequencyError = fieldError("frequency");
  return (
    <div className="dashboard-maintenance-toggles">
      <label>
        <input
          type="checkbox"
          name="isActive"
          value="true"
          checked={draft.isActive}
          onChange={(event) => onChange("isActive", event.target.checked)}
        />
        <span>
          <strong>{labels.fields.isActive.label}</strong>
          <small>{labels.fields.isActive.help}</small>
        </span>
      </label>
      <fieldset
        aria-describedby={
          frequencyError ? `${idPrefix}-frequency-error` : undefined
        }
      >
        <legend className="sr-only">{labels.validation.frequency}</legend>
        {(["oneTimeAvailable", "periodicAvailable"] as const).map(
          (field) => (
            <label key={field}>
              <input
                type="checkbox"
                name={field}
                value="true"
                checked={draft[field]}
                onChange={(event) => onChange(field, event.target.checked)}
                aria-invalid={Boolean(frequencyError)}
              />
              <span>
                <strong>{labels.fields[field].label}</strong>
                <small>{labels.fields[field].help}</small>
              </span>
            </label>
          ),
        )}
        {frequencyError ? (
          <p
            id={`${idPrefix}-frequency-error`}
            className="dashboard-maintenance-field-error"
            role="alert"
          >
            {frequencyError}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}

export function MaintenancePriceFields({
  draft,
  labels,
  idPrefix,
  priceable,
  fieldError,
  onChange,
}: {
  draft: MaintenanceServiceDraft;
  labels: MaintenanceLabels;
  idPrefix: string;
  priceable: boolean;
  fieldError: FieldError;
  onChange: (
    field: "oneTimePrice" | "periodicPrice",
    value: string,
  ) => void;
}) {
  if (!priceable) {
    return (
      <p className="dashboard-maintenance-technical-pricing">
        {labels.technicalPricing}
      </p>
    );
  }

  return (
    <div className="dashboard-maintenance-price-fields">
      {(["oneTimePrice", "periodicPrice"] as const).map((field) => {
        const isOneTime = field === "oneTimePrice";
        const available = isOneTime
          ? draft.oneTimeAvailable
          : draft.periodicAvailable;
        const copy = isOneTime
          ? labels.fields.oneTimePrice
          : labels.fields.periodicPrice;
        const error = fieldError(field);
        const errorId = `${idPrefix}-${field}-error`;
        return (
          <div className="dashboard-maintenance-price-field" key={field}>
            <label htmlFor={`${idPrefix}-${field}`}>
              <strong>
                {copy.label} ({labels.currency})
              </strong>
              <small>{copy.help}</small>
            </label>
            <input
              id={`${idPrefix}-${field}`}
              name={field}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft[field]}
              maxLength={MAINTENANCE_PRICE_INPUT_MAX_LENGTH}
              disabled={!available}
              onChange={(event) => onChange(field, event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
            {error ? (
              <p
                id={errorId}
                className="dashboard-maintenance-field-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
