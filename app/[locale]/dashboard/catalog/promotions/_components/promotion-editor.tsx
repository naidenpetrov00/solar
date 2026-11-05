"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { LocalizedEditorSwitch } from "../../../_components/localized-editor-switch";
import type {
  ManagedPromotionDetail,
  ManagedPromotionTarget,
} from "@/lib/catalog/management-promotion-types";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { savePromotionAction } from "../promotion-actions";
import { idlePromotionActionResult } from "../promotion-action-model";
import type { PromotionLabels } from "./promotion-labels";
import { PromotionTargets } from "./promotion-targets";
import { useCatalogUnsavedGuard } from "../../_components/use-catalog-unsaved-guard";
import { usePromotionEditorDraft } from "./use-promotion-editor-draft";

export function PromotionEditor({
  detail,
  locale,
  canManage,
  categories,
  products,
  labels,
  path,
}: {
  detail: ManagedPromotionDetail | null;
  locale: string;
  canManage: boolean;
  categories: ManagedPromotionTarget[];
  products: ManagedPromotionTarget[];
  labels: PromotionLabels;
  path: string;
}) {
  const router = useRouter();
  const [result, action, pending] = useActionState(
    savePromotionAction,
    idlePromotionActionResult,
  );
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>("bg");
  const { markDirty, clearDirty } = useCatalogUnsavedGuard(
    labels.unsavedChanges,
  );
  const { draft, update, updateLabel, toggleTarget } =
    usePromotionEditorDraft(detail, () => markDirty("general"));
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result.status === "error") errorRef.current?.focus();
    if (result.status === "success" && result.targetId) {
      clearDirty("general");
      router.replace(`${path}?promotion=${result.targetId}`);
      router.refresh();
    }
  }, [clearDirty, path, result, router]);
  const errors = result.fieldErrors ?? {};
  const errorText = (key: string) =>
    errors[key]
      ? errors[key] === "REQUIRED"
        ? labels.validation.required
        : labels.validation.invalid
      : undefined;
  return (
    <form action={action} className="dashboard-promotion-editor" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="promotionId" value={detail?.id ?? ""} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={result.updatedAt ?? detail?.updatedAt ?? ""}
      />
      {result.code ? (
        <div
          ref={errorRef}
          className="dashboard-catalog-result"
          data-tone={result.status}
          role={result.status === "error" ? "alert" : "status"}
          tabIndex={result.status === "error" ? -1 : undefined}
        >
          <p>{labels.results[result.code]}</p>
          {result.code === "STALE" ? (
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              {labels.actions.reload}
            </Button>
          ) : null}
        </div>
      ) : null}
      <fieldset disabled={pending}>
        <div className="dashboard-catalog-field">
          <label htmlFor="promotion-internal-name">{labels.fields.internalName.label}</label>
          <p id="promotion-internal-name-help">{labels.fields.internalName.help}</p>
          <input id="promotion-internal-name" name="internalName" value={draft.internalName} onChange={(event) => update("internalName", event.target.value)} readOnly={!canManage} aria-invalid={Boolean(errors.internalName)} aria-describedby={`promotion-internal-name-help${errors.internalName ? " promotion-internal-name-error" : ""}`} />
          {errorText("internalName") ? <p id="promotion-internal-name-error" role="alert">{errorText("internalName")}</p> : null}
        </div>
        <LocalizedEditorSwitch idPrefix="promotion-label" variant="tabs" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={labels.languages} statusByLocale={Object.fromEntries(catalogLocales.map((item) => [item, Boolean(draft.labels[item])])) as Record<CatalogLocale, boolean>} completeLabel={labels.localeSwitch.set} incompleteLabel={labels.localeSwitch.empty} ariaLabel={labels.localeSwitch.label} />
        {catalogLocales.map((contentLocale) => (
          <div key={contentLocale} id={`promotion-label-panel-${contentLocale}`} role="tabpanel" aria-labelledby={`promotion-label-language-${contentLocale}`} hidden={activeLocale !== contentLocale} className="dashboard-catalog-field">
            <label htmlFor={`promotion-label-${contentLocale}`}>{labels.fields.publicLabel.label}</label>
            <p id={`promotion-label-${contentLocale}-help`}>{labels.fields.publicLabel.help}</p>
            <input id={`promotion-label-${contentLocale}`} name={`label.${contentLocale}`} value={draft.labels[contentLocale]} onChange={(event) => updateLabel(contentLocale, event.target.value)} readOnly={!canManage} aria-invalid={Boolean(errors[`label.${contentLocale}`])} aria-describedby={`promotion-label-${contentLocale}-help${errors[`label.${contentLocale}`] ? ` promotion-label-${contentLocale}-error` : ""}`} />
            {errorText(`label.${contentLocale}`) ? <p id={`promotion-label-${contentLocale}-error`} role="alert">{errorText(`label.${contentLocale}`)}</p> : null}
          </div>
        ))}
        <div className="dashboard-promotion-grid">
          <label>{labels.fields.discountType.label}<span>{labels.fields.discountType.help}</span><select name="discountType" value={draft.discountType} onChange={(event) => update("discountType", event.target.value as "percentage" | "fixed_eur")} disabled={!canManage}><option value="percentage">{labels.discountTypes.percentage}</option><option value="fixed_eur">{labels.discountTypes.fixed_eur}</option></select></label>
          <label>{labels.fields.discountValue.label}<span>{labels.fields.discountValue.help}</span><input name="discountValue" inputMode="decimal" value={draft.discountValue} onChange={(event) => update("discountValue", event.target.value)} readOnly={!canManage} aria-invalid={Boolean(errors.discountValue)} aria-describedby={errors.discountValue ? "promotion-discount-error" : undefined} />{errorText("discountValue") ? <span id="promotion-discount-error" role="alert">{errorText("discountValue")}</span> : null}</label>
        </div>
        <fieldset
          className="dashboard-promotion-scope"
          aria-describedby={`promotion-scope-help${errors.scope ? " promotion-scope-error" : ""}`}
        >
          <legend>{labels.fields.scope.label}</legend>
          <p id="promotion-scope-help">{labels.fields.scope.help}</p>
          {(["catalog", "category", "product"] as const).map((item) => (
            <label key={item}>
              <input
                type="radio"
                name="scope"
                value={item}
                checked={draft.scope === item}
                onChange={() => update("scope", item)}
                disabled={!canManage}
                aria-invalid={Boolean(errors.scope)}
              />
              {labels.scopes[item]}
            </label>
          ))}
          {errorText("scope") ? (
            <p id="promotion-scope-error" role="alert">
              {errorText("scope")}
            </p>
          ) : null}
        </fieldset>
        <div hidden={draft.scope !== "category"}><PromotionTargets kind="category" targets={categories} selectedIds={draft.categoryIds} labels={labels} disabled={!canManage || pending || draft.scope !== "category"} error={errorText("categoryIds")} onToggle={(id, selected) => toggleTarget("category", id, selected)} /></div>
        <div hidden={draft.scope !== "product"}><PromotionTargets kind="product" targets={products} selectedIds={draft.productIds} labels={labels} disabled={!canManage || pending || draft.scope !== "product"} error={errorText("productIds")} onToggle={(id, selected) => toggleTarget("product", id, selected)} /></div>
        <div className="dashboard-promotion-grid">
          <label>{labels.fields.startsAt.label}<span>{labels.fields.startsAt.help}</span><input type="datetime-local" name="startsAt" value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} readOnly={!canManage} aria-invalid={Boolean(errors.startsAt)} aria-describedby={errors.startsAt ? "promotion-start-error" : undefined} />{errorText("startsAt") ? <span id="promotion-start-error" role="alert">{errorText("startsAt")}</span> : null}</label>
          <label>{labels.fields.endsAt.label}<span>{labels.fields.endsAt.help}</span><input type="datetime-local" name="endsAt" value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} readOnly={!canManage} aria-invalid={Boolean(errors.endsAt)} aria-describedby={errors.endsAt ? "promotion-end-error" : undefined} />{errorText("endsAt") ? <span id="promotion-end-error" role="alert">{errorText("endsAt")}</span> : null}</label>
        </div>
        <div className="dashboard-catalog-field">
          <label className="dashboard-promotion-active">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              checked={draft.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
              disabled={!canManage}
              aria-describedby="promotion-active-help"
            />
            {labels.fields.isActive.label}
          </label>
          <p id="promotion-active-help">{labels.fields.isActive.help}</p>
        </div>
        <Button type="submit" disabled={!canManage || pending}>{pending ? labels.actions.saving : labels.actions.save}</Button>
      </fieldset>
    </form>
  );
}
