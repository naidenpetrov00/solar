"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/button";
import { formatCurrencyMinor } from "../../../_lib/catalog-format";
import { DashboardSelect } from "../../_components/dashboard-select";
import { useUnsavedChangesGuard } from "../../_components/use-unsaved-changes-guard";
import { calculateProvisionalTotals } from "@/lib/orders/decimal-money";
import type { ManagedOrderRevision } from "@/lib/orders/management-model";
import { orderPaymentMethods } from "@/lib/orders/model";
import { saveOrderAction, searchOrderProductsAction } from "../actions";
import { initialOrderActionResult, type ProductSearchResult } from "../order-action-model";
import type { OrdersLabels } from "../order-labels";
import { OrderAdjustmentFields } from "./order-adjustment-fields";
import {
  draftFromRevision,
  newAdjustment,
  newProductLine,
  revisionPayload,
  type OrderEditorDraft,
} from "./order-editor-draft";
import { OrderLineEditor } from "./order-line-editor";

export function OrderEditor({
  orderId,
  revision,
  mutationVersion,
  dashboardLocale,
  latestHref,
  labels,
  onDirtyChange,
}: {
  orderId: string;
  revision: ManagedOrderRevision;
  mutationVersion: number;
  dashboardLocale: string;
  latestHref: string;
  labels: OrdersLabels;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const initial = useMemo(() => draftFromRevision(revision), [revision]);
  const [draft, setDraft] = useState<OrderEditorDraft>(initial);
  const [baseline, setBaseline] = useState(() => revisionPayload(initial));
  const [result, action, pending] = useActionState(saveOrderAction, initialOrderActionResult);
  const [productQuery, setProductQuery] = useState("");
  const [productSearch, setProductSearch] = useState<ProductSearchResult>({ status: "idle" });
  const [searchPending, startSearch] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);
  const payload = revisionPayload(draft);
  const dirty = payload !== baseline;
  const provisional = calculateProvisionalTotals({
    lines: draft.lines.map((line) => ({
      quantity: Number(line.quantity),
      effectiveUnitGrossMinor: line.effectiveUnitGrossMinor,
      vatRateBasisPoints: line.vatRateBasisPoints,
      adjustments: line.adjustments,
    })),
    orderAdjustments: draft.orderAdjustments,
  });
  const discard = useCallback(() => {
    const next = draftFromRevision(revision);
    setDraft(next);
    setBaseline(revisionPayload(next));
  }, [revision]);
  const { confirmDiscard } = useUnsavedChangesGuard({
    hasUnsavedChanges: dirty,
    message: labels.editor.unsaved,
    onDiscard: discard,
  });

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    if (
      result.status === "success" &&
      result.mutationVersion === mutationVersion
    ) discard();
    if (result.status === "error") summaryRef.current?.focus();
  }, [discard, mutationVersion, result]);

  const updateCustomer = (field: keyof OrderEditorDraft["customer"], value: string) => {
    setDraft((current) => ({
      ...current,
      customer: { ...current.customer, [field]: value },
    }));
  };
  const searchProducts = () => {
    setProductSearch({ status: "pending" });
    startSearch(async () => {
      setProductSearch(await searchOrderProductsAction({
        orderId,
        query: productQuery,
        excludedIds: draft.lines.map(({ productId }) => productId),
      }));
    });
  };
  const fieldError = (field: string) => result.fieldErrors?.[field];

  return (
    <section className="dashboard-order-editor" aria-labelledby="order-editor-title">
      <div className="dashboard-order-section-heading">
        <div><h2 id="order-editor-title">{labels.editor.title}</h2><p>{labels.editor.description}</p></div>
        {dirty ? <span className="dashboard-order-dirty">{labels.editor.unsaved}</span> : null}
      </div>
      {result.status !== "idle" ? (
        <div
          ref={summaryRef}
          className="dashboard-order-result"
          data-tone={result.status}
          role={result.status === "error" ? "alert" : "status"}
          tabIndex={result.status === "error" ? -1 : undefined}
        >
          <p>{result.code ? labels.results[result.code] : labels.editor.validationSummary}</p>
          {result.code === "STALE" ? (
            <div className="dashboard-order-result-actions">
              <ButtonLink href={latestHref} target="_blank" rel="noreferrer" variant="secondary">
                {labels.editor.reviewLatest}
              </ButtonLink>
              <Button type="button" variant="informational" onClick={() => {
                if (confirmDiscard()) window.location.reload();
              }}>{labels.editor.discardReload}</Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <form action={action} noValidate aria-busy={pending} className="dashboard-order-edit-form">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="expectedVersion" value={mutationVersion} />
        <input type="hidden" name="dashboardLocale" value={dashboardLocale} />
        <input type="hidden" name="payload" value={payload} />
        <fieldset disabled={pending} className="dashboard-order-customer-fields">
          <legend>{labels.detail.customer}</legend>
          {(["name", "phone", "email", "city", "deliveryAddress"] as const).map((field) => (
            <label key={field} htmlFor={`order-customer-${field}`}>
              <span>{labels.detail[field]}</span>
              {field === "deliveryAddress" ? (
                <textarea
                  id={`order-customer-${field}`}
                  value={draft.customer[field]}
                  autoComplete="section-delivery shipping street-address"
                  aria-invalid={Boolean(fieldError(field))}
                  aria-describedby={fieldError(field) ? `order-customer-${field}-error` : undefined}
                  onChange={(event) => updateCustomer(field, event.target.value)}
                />
              ) : (
                <input
                  id={`order-customer-${field}`}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  value={draft.customer[field]}
                  autoComplete={
                    field === "name"
                      ? "section-customer name"
                      : field === "phone"
                        ? "section-customer tel"
                        : field === "email"
                          ? "section-customer email"
                          : "section-delivery shipping address-level2"
                  }
                  aria-invalid={Boolean(fieldError(field))}
                  aria-describedby={fieldError(field) ? `order-customer-${field}-error` : undefined}
                  onChange={(event) => updateCustomer(field, event.target.value)}
                />
              )}
              {fieldError(field) ? (
                <small id={`order-customer-${field}-error`} className="dashboard-order-field-error">
                  {fieldError(field) === "REQUIRED" ? labels.editor.required : labels.editor.invalid}
                </small>
              ) : null}
            </label>
          ))}
          <label htmlFor="order-customer-note">
            <span>{labels.detail.note}</span>
            <textarea
              id="order-customer-note"
              value={draft.customer.note ?? ""}
              maxLength={2000}
              onChange={(event) => updateCustomer("note", event.target.value)}
            />
          </label>
          <label htmlFor="order-payment-method">
            <span>{labels.detail.paymentMethod}</span>
            <DashboardSelect
              id="order-payment-method"
              value={draft.paymentMethod}
              aria-invalid={Boolean(fieldError("paymentMethod"))}
              aria-describedby={fieldError("paymentMethod") ? "order-payment-method-error" : undefined}
              onChange={(event) => setDraft((current) => ({
                ...current,
                paymentMethod: event.target.value as OrderEditorDraft["paymentMethod"],
              }))}
            >
              {orderPaymentMethods.map((method) => (
                <option key={method} value={method}>{labels.paymentMethods[method]}</option>
              ))}
            </DashboardSelect>
            {fieldError("paymentMethod") ? (
              <small id="order-payment-method-error" className="dashboard-order-field-error">
                {labels.editor.invalid}
              </small>
            ) : null}
          </label>
        </fieldset>

        <section className="dashboard-order-product-editor" aria-labelledby="order-products-title">
          <div className="dashboard-order-subheading"><h3 id="order-products-title">{labels.detail.products}</h3></div>
          {draft.lines.map((line, index) => (
            <OrderLineEditor
              key={line.draftKey}
              line={line}
              index={index}
              locale={dashboardLocale}
              labels={labels}
              disabled={pending}
              fieldErrors={result.fieldErrors}
              canRemove={draft.lines.length > 1}
              onChange={(next) => setDraft((current) => ({
                ...current,
                lines: current.lines.map((candidate) => candidate.draftKey === line.draftKey ? next : candidate),
              }))}
              onRemove={() => setDraft((current) => ({
                ...current,
                lines: current.lines.filter((candidate) => candidate.draftKey !== line.draftKey),
              }))}
            />
          ))}
        </section>

        <section className="dashboard-order-product-search" aria-labelledby="order-product-search-title">
          <h3 id="order-product-search-title">{labels.editor.addProduct}</h3>
          <label htmlFor="order-product-search"><span>{labels.editor.productSearch}</span>
            <input
              id="order-product-search"
              type="search"
              value={productQuery}
              maxLength={100}
              placeholder={labels.editor.productSearchPlaceholder}
              onChange={(event) => setProductQuery(event.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" disabled={searchPending || pending} onClick={searchProducts}>
            {searchPending ? labels.editor.searching : labels.editor.search}
          </Button>
          <span className="sr-only" role="status" aria-live="polite">
            {searchPending ? labels.editor.searching : ""}
          </span>
          {productSearch.status === "error" ? (
            <p className="dashboard-order-search-result" role="alert">{labels.results[productSearch.code]}</p>
          ) : productSearch.status === "success" ? (
            productSearch.products.length ? <ul className="dashboard-order-product-results">
              {productSearch.products.map((product) => <li key={product.id}>
                <span><strong>{product.title}</strong><small>{product.sku} · {formatCurrencyMinor(dashboardLocale, product.effectiveUnitGrossMinor)}</small></span>
                <Button type="button" variant="secondary" size="compact" onClick={() => {
                  setDraft((current) => ({ ...current, lines: [...current.lines, newProductLine(product)] }));
                  setProductSearch({ status: "idle" });
                }}>{labels.editor.add}</Button>
              </li>)}
            </ul> : <p className="dashboard-order-search-result">{labels.editor.noProducts}</p>
          ) : null}
        </section>

        <section className="dashboard-order-adjustment-editor" aria-labelledby="order-adjustments-title">
          <div className="dashboard-order-subheading">
            <h3 id="order-adjustments-title">{labels.detail.orderAdjustments}</h3>
            <Button type="button" variant="secondary" size="compact" onClick={() => setDraft((current) => ({
              ...current,
              orderAdjustments: [...current.orderAdjustments, newAdjustment()],
            }))}>{labels.editor.addAdjustment}</Button>
          </div>
          {draft.orderAdjustments.map((adjustment, index) => (
            <OrderAdjustmentFields
              key={adjustment.draftKey}
              id={`order-adjustment-${index}`}
              value={adjustment}
              labels={labels}
              disabled={pending}
              errors={{
                direction: Boolean(result.fieldErrors?.[`orderAdjustments.${index}.direction`]),
                amount: Boolean(result.fieldErrors?.[`orderAdjustments.${index}.amount`]),
                reason: Boolean(result.fieldErrors?.[`orderAdjustments.${index}.reason`]),
              }}
              onChange={(next) => setDraft((current) => ({
                ...current,
                orderAdjustments: current.orderAdjustments.map((candidate) =>
                  candidate.draftKey === adjustment.draftKey ? next : candidate),
              }))}
              onRemove={() => setDraft((current) => ({
                ...current,
                orderAdjustments: current.orderAdjustments.filter(
                  (candidate) => candidate.draftKey !== adjustment.draftKey,
                ),
              }))}
            />
          ))}
        </section>

        <aside className="dashboard-order-provisional" aria-live="polite">
          <h3>{labels.editor.provisional}</h3>
          {provisional ? <dl>
            <div><dt>{labels.detail.net}</dt><dd>{formatCurrencyMinor(dashboardLocale, provisional.totalNetMinor)}</dd></div>
            <div><dt>{labels.detail.vatTotal}</dt><dd>{formatCurrencyMinor(dashboardLocale, provisional.totalVatMinor)}</dd></div>
            <div><dt>{labels.detail.total}</dt><dd>{formatCurrencyMinor(dashboardLocale, provisional.totalGrossMinor)}</dd></div>
          </dl> : <p>{labels.editor.provisionalUnavailable}</p>}
        </aside>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? labels.editor.saving : labels.editor.save}
        </Button>
      </form>
    </section>
  );
}
