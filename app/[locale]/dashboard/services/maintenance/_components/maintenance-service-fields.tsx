"use client";

import {
  MAINTENANCE_PRICE_LABEL_MAX_LENGTH,
  maintenanceLocales,
  type MaintenanceLocale,
  type ManagedMaintenanceService,
} from "@/lib/maintenance/model";
import type { MaintenanceLabels } from "./maintenance-labels";
import { MaintenanceLocaleSwitch } from "./maintenance-locale-switch";

export type MaintenanceServiceDraft = Omit<
  ManagedMaintenanceService,
  "oneTimePriceLabels" | "periodicPriceLabels"
> & {
  oneTimePriceLabels: Record<MaintenanceLocale, string>;
  periodicPriceLabels: Record<MaintenanceLocale, string>;
};

type FieldError = (key: string) => string | null;

export function MaintenanceToggleFields({ draft, labels, idPrefix, fieldError, onChange }: {
  draft: MaintenanceServiceDraft;
  labels: MaintenanceLabels;
  idPrefix: string;
  fieldError: FieldError;
  onChange: (field: "isActive" | "oneTimeAvailable" | "periodicAvailable", value: boolean) => void;
}) {
  const frequencyError = fieldError("frequency");
  return (
    <div className="dashboard-maintenance-toggles">
      <label>
        <input type="checkbox" name="isActive" value="true" checked={draft.isActive} onChange={(event) => onChange("isActive", event.target.checked)} />
        <span><strong>{labels.fields.isActive.label}</strong><small>{labels.fields.isActive.help}</small></span>
      </label>
      <fieldset aria-describedby={frequencyError ? `${idPrefix}-frequency-error` : undefined}>
        <legend className="sr-only">{labels.validation.frequency}</legend>
        {(["oneTimeAvailable", "periodicAvailable"] as const).map((field) => (
          <label key={field}>
            <input type="checkbox" name={field} value="true" checked={draft[field]} onChange={(event) => onChange(field, event.target.checked)} aria-invalid={Boolean(frequencyError)} />
            <span><strong>{labels.fields[field].label}</strong><small>{labels.fields[field].help}</small></span>
          </label>
        ))}
        {frequencyError ? <p id={`${idPrefix}-frequency-error`} className="dashboard-maintenance-field-error" role="alert">{frequencyError}</p> : null}
      </fieldset>
    </div>
  );
}

export function MaintenancePriceFields({ draft, labels, idPrefix, activeLocale, fieldError, onLocaleChange, onLabelChange }: {
  draft: MaintenanceServiceDraft;
  labels: MaintenanceLabels;
  idPrefix: string;
  activeLocale: MaintenanceLocale;
  fieldError: FieldError;
  onLocaleChange: (locale: MaintenanceLocale) => void;
  onLabelChange: (frequency: "oneTimePriceLabels" | "periodicPriceLabels", locale: MaintenanceLocale, value: string) => void;
}) {
  return (
    <>
      <MaintenanceLocaleSwitch idPrefix={`${idPrefix}-prices`} activeLocale={activeLocale} onChange={onLocaleChange} languageNames={labels.languages} ariaLabel={labels.localeTabsLabel} />
      {maintenanceLocales.map((contentLocale) => (
        <div key={contentLocale} id={`${idPrefix}-prices-panel-${contentLocale}`} role="tabpanel" aria-labelledby={`${idPrefix}-prices-language-${contentLocale}`} hidden={activeLocale !== contentLocale} className="dashboard-maintenance-price-fields">
          {(["oneTimePriceLabels", "periodicPriceLabels"] as const).map((frequency) => {
            const key = `${frequency}.${contentLocale}`;
            const kind = frequency === "oneTimePriceLabels" ? "one-time" : "periodic";
            const label = frequency === "oneTimePriceLabels" ? labels.fields.oneTimePriceLabel : labels.fields.periodicPriceLabel;
            const error = fieldError(key);
            return (
              <div className="dashboard-maintenance-price-field" key={frequency}>
                <label htmlFor={`${idPrefix}-${kind}-${contentLocale}`}><strong>{label.label}</strong><small>{label.help}</small></label>
                <input id={`${idPrefix}-${kind}-${contentLocale}`} name={key} value={draft[frequency][contentLocale]} maxLength={MAINTENANCE_PRICE_LABEL_MAX_LENGTH} onChange={(event) => onLabelChange(frequency, contentLocale, event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${idPrefix}-${kind}-${contentLocale}-error` : undefined} />
                {error ? <p id={`${idPrefix}-${kind}-${contentLocale}-error`} className="dashboard-maintenance-field-error" role="alert">{error}</p> : null}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
