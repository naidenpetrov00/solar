"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/button";
import {
  maintenanceLocales,
  type MaintenanceLocale,
  type ManagedMaintenanceService,
} from "@/lib/maintenance/model";
import { saveMaintenanceServiceAction } from "../actions";
import { idleMaintenanceActionResult, type MaintenanceActionResult } from "../action-model";
import { MaintenanceActionFeedback } from "./maintenance-action-feedback";
import type { MaintenanceLabels } from "./maintenance-labels";
import {
  MaintenancePriceFields,
  MaintenanceToggleFields,
  type MaintenanceServiceDraft,
} from "./maintenance-service-fields";

function createDraft(service: ManagedMaintenanceService): MaintenanceServiceDraft {
  return {
    ...service,
    oneTimePriceLabels: Object.fromEntries(
      maintenanceLocales.map((locale) => [locale, service.oneTimePriceLabels[locale] ?? ""]),
    ) as MaintenanceServiceDraft["oneTimePriceLabels"],
    periodicPriceLabels: Object.fromEntries(
      maintenanceLocales.map((locale) => [locale, service.periodicPriceLabels[locale] ?? ""]),
    ) as MaintenanceServiceDraft["periodicPriceLabels"],
  };
}

function errorLocale(result: MaintenanceActionResult) {
  const key = Object.keys(result.fieldErrors ?? {}).find((candidate) =>
    maintenanceLocales.some((locale) => candidate.endsWith(`.${locale}`)),
  );
  const locale = key?.split(".").at(-1);
  return maintenanceLocales.find((candidate) => candidate === locale) ?? null;
}

export function MaintenanceServiceEditor({ service, serviceName, locale, labels, canManage }: {
  service: ManagedMaintenanceService;
  serviceName: string;
  locale: string;
  labels: MaintenanceLabels;
  canManage: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => createDraft(service));
  const [activeLocale, setActiveLocale] = useState<MaintenanceLocale>("bg");
  const [saveResult, saveAction, savePending] = useActionState(saveMaintenanceServiceAction, idleMaintenanceActionResult);
  const saveResultRef = useRef<HTMLDivElement>(null);
  const idPrefix = `maintenance-${service.code}`;

  useEffect(() => {
    if (saveResult.status === "success") {
      router.refresh();
      return;
    }
    if (saveResult.status === "error") {
      const localeWithError = errorLocale(saveResult);
      const focusInvalid = () => {
        const invalid = document.querySelector<HTMLElement>(`#${idPrefix}-form [aria-invalid="true"]`);
        (invalid ?? saveResultRef.current)?.focus();
      };
      if (localeWithError) {
        requestAnimationFrame(() => {
          setActiveLocale(localeWithError);
          requestAnimationFrame(focusInvalid);
        });
      } else {
        requestAnimationFrame(focusInvalid);
      }
    }
  }, [idPrefix, router, saveResult]);

  const updateBoolean = (field: "isActive" | "oneTimeAvailable" | "periodicAvailable", value: boolean) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const updateLabel = (frequency: "oneTimePriceLabels" | "periodicPriceLabels", contentLocale: MaintenanceLocale, value: string) => {
    setDraft((current) => ({ ...current, [frequency]: { ...current[frequency], [contentLocale]: value } }));
  };
  const fieldError = (key: string) => {
    const code = saveResult.fieldErrors?.[key];
    if (!code) return null;
    if (key === "frequency") return labels.validation.frequency;
    if (code === "REQUIRED") return labels.validation.required;
    if (code === "TOO_LONG") return labels.validation.tooLong;
    return labels.validation.invalid;
  };

  return (
    <section className="dashboard-maintenance-service" aria-labelledby={`${idPrefix}-title`}>
      <header className="dashboard-maintenance-service-heading">
        <div><h2 id={`${idPrefix}-title`}>{serviceName}</h2></div>
        <span data-active={draft.isActive}>{draft.isActive ? labels.states.active : labels.states.hidden}</span>
      </header>

      <form
        id={`${idPrefix}-form`}
        action={saveAction}
        className="dashboard-maintenance-form"
        noValidate
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="code" value={service.code} />
        <input type="hidden" name="expectedUpdatedAt" value={service.updatedAt} />
        <MaintenanceActionFeedback result={saveResult} resultRef={saveResultRef} labels={labels} />
        <fieldset disabled={!canManage || savePending}>
          <legend className="sr-only">{serviceName}</legend>
          <MaintenanceToggleFields draft={draft} labels={labels} idPrefix={idPrefix} fieldError={fieldError} onChange={updateBoolean} />
          <MaintenancePriceFields draft={draft} labels={labels} idPrefix={idPrefix} activeLocale={activeLocale} fieldError={fieldError} onLocaleChange={setActiveLocale} onLabelChange={updateLabel} />
          <Button type="submit" disabled={!canManage || savePending}>{savePending ? labels.actions.saving : labels.actions.save}</Button>
        </fieldset>
      </form>
    </section>
  );
}
