"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/button";
import {
  isMaintenancePriceableServiceCode,
  type ManagedMaintenanceService,
} from "@/lib/maintenance/model";
import { euroCentsToInput } from "@/lib/maintenance/validation";
import { saveMaintenanceServiceAction } from "../actions";
import { idleMaintenanceActionResult } from "../action-model";
import { MaintenanceActionFeedback } from "./maintenance-action-feedback";
import type { MaintenanceLabels } from "./maintenance-labels";
import {
  MaintenancePriceFields,
  MaintenanceToggleFields,
  type MaintenanceServiceDraft,
} from "./maintenance-service-fields";

function createDraft(
  service: ManagedMaintenanceService,
): MaintenanceServiceDraft {
  const { oneTimePriceCents, periodicPriceCents, ...details } = service;
  return {
    ...details,
    oneTimePrice: euroCentsToInput(oneTimePriceCents),
    periodicPrice: euroCentsToInput(periodicPriceCents),
  };
}

export function MaintenanceServiceEditor({
  service,
  serviceName,
  locale,
  labels,
  canManage,
}: {
  service: ManagedMaintenanceService;
  serviceName: string;
  locale: string;
  labels: MaintenanceLabels;
  canManage: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => createDraft(service));
  const [saveResult, saveAction, savePending] = useActionState(
    saveMaintenanceServiceAction,
    idleMaintenanceActionResult,
  );
  const saveResultRef = useRef<HTMLDivElement>(null);
  const idPrefix = `maintenance-${service.code}`;

  useEffect(() => {
    if (saveResult.status === "success") {
      router.refresh();
    } else if (saveResult.status === "error") {
      requestAnimationFrame(() => {
        const invalid = document.querySelector<HTMLElement>(
          `#${idPrefix}-form [aria-invalid="true"]`,
        );
        (invalid ?? saveResultRef.current)?.focus();
      });
    }
  }, [idPrefix, router, saveResult]);

  const updateBoolean = (
    field: "isActive" | "oneTimeAvailable" | "periodicAvailable",
    value: boolean,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "oneTimeAvailable" && !value
        ? { oneTimePrice: "" }
        : {}),
      ...(field === "periodicAvailable" && !value
        ? { periodicPrice: "" }
        : {}),
    }));
  };

  const fieldError = (key: string) => {
    const code = saveResult.fieldErrors?.[key];
    if (!code) return null;
    if (key === "frequency") return labels.validation.frequency;
    return code === "REQUIRED"
      ? labels.validation.required
      : labels.validation.invalid;
  };

  return (
    <section
      className="dashboard-maintenance-service"
      aria-labelledby={`${idPrefix}-title`}
    >
      <header className="dashboard-maintenance-service-heading">
        <h2 id={`${idPrefix}-title`}>{serviceName}</h2>
        <span data-active={draft.isActive}>
          {draft.isActive ? labels.states.active : labels.states.hidden}
        </span>
      </header>

      <form
        id={`${idPrefix}-form`}
        action={saveAction}
        className="dashboard-maintenance-form"
        noValidate
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="code" value={service.code} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={service.updatedAt}
        />
        <MaintenanceActionFeedback
          result={saveResult}
          resultRef={saveResultRef}
          labels={labels}
        />
        <fieldset disabled={!canManage || savePending}>
          <legend className="sr-only">{serviceName}</legend>
          <MaintenanceToggleFields
            draft={draft}
            labels={labels}
            idPrefix={idPrefix}
            fieldError={fieldError}
            onChange={updateBoolean}
          />
          <MaintenancePriceFields
            draft={draft}
            labels={labels}
            idPrefix={idPrefix}
            priceable={isMaintenancePriceableServiceCode(service.code)}
            fieldError={fieldError}
            onChange={(field, value) =>
              setDraft((current) => ({ ...current, [field]: value }))
            }
          />
          <Button type="submit" disabled={!canManage || savePending}>
            {savePending ? labels.actions.saving : labels.actions.save}
          </Button>
        </fieldset>
      </form>
    </section>
  );
}
