"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { Button } from "@/components/button";
import type { ManagedOrderEmailDelivery } from "@/lib/orders/management-model";
import { retryOrderNotificationAction } from "../actions";
import { initialOrderActionResult } from "../order-action-model";
import type { OrdersLabels } from "../order-labels";

export function OrderEmailDeliveries({
  orderId,
  deliveries,
  locale,
  canManage,
  labels,
}: {
  orderId: string;
  deliveries: ManagedOrderEmailDelivery[];
  locale: string;
  canManage: boolean;
  labels: OrdersLabels;
}) {
  const [selected, setSelected] = useState<ManagedOrderEmailDelivery | null>(null);
  const [result, action, pending] = useActionState(
    retryOrderNotificationAction,
    initialOrderActionResult,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const resultAtOpenRef = useRef(initialOrderActionResult);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Sofia",
        timeZoneName: "short",
      }),
    [locale],
  );
  const formatTime = (value: string | null) =>
    value ? <time dateTime={value}>{formatter.format(new Date(value))}</time> : labels.emailDelivery.notAvailable;
  const hasNewResult = selected !== null && result !== resultAtOpenRef.current;

  useEffect(() => {
    if (!hasNewResult) return;
    if (result.status === "success") dialogRef.current?.close();
    else if (result.status === "error") errorRef.current?.focus();
  }, [hasNewResult, result]);

  const open = (
    delivery: ManagedOrderEmailDelivery,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    invokerRef.current = event.currentTarget;
    resultAtOpenRef.current = result;
    setSelected(delivery);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  };

  return (
    <section className="dashboard-order-email-deliveries" aria-labelledby="order-email-deliveries-title">
      <h2 id="order-email-deliveries-title">{labels.emailDelivery.title}</h2>
      <p>{labels.emailDelivery.description}</p>
      {result.status === "success" && result.code ? (
        <p className="dashboard-order-result" data-tone="success" role="status">{labels.results[result.code]}</p>
      ) : null}
      {deliveries.length === 0 ? <p>{labels.emailDelivery.empty}</p> : (
        <div className="dashboard-order-email-list">
          {deliveries.map((delivery) => (
            <article key={delivery.id} className="dashboard-order-email-item">
              <header>
                <h3>{labels.emailDelivery.kinds[delivery.notificationKind]}</h3>
                <span className="dashboard-order-status" data-status={delivery.status}>{labels.emailDelivery.statuses[delivery.status]}</span>
              </header>
              <dl>
                <div><dt>{labels.emailDelivery.recipient}</dt><dd>{delivery.recipientName}<br /><span>{delivery.recipientEmail}</span></dd></div>
                <div><dt>{labels.emailDelivery.recipientType}</dt><dd>{delivery.recipientType === "customer" ? labels.emailDelivery.customer : labels.emailDelivery.internal}</dd></div>
                <div><dt>{labels.emailDelivery.templateVersion}</dt><dd>{delivery.templateVersion}</dd></div>
                <div><dt>{labels.emailDelivery.revision}</dt><dd>{delivery.revisionNumber}</dd></div>
                <div><dt>{labels.emailDelivery.attempts}</dt><dd>{delivery.attemptCount}</dd></div>
                <div><dt>{labels.emailDelivery.manualRetries}</dt><dd>{delivery.manualRetryCount}</dd></div>
                <div><dt>{labels.emailDelivery.createdAt}</dt><dd>{formatTime(delivery.createdAt)}</dd></div>
                <div><dt>{labels.emailDelivery.lastAttemptAt}</dt><dd>{formatTime(delivery.lastAttemptAt)}</dd></div>
                <div><dt>{labels.emailDelivery.nextAttemptAt}</dt><dd>{formatTime(delivery.nextAttemptAt)}</dd></div>
                <div><dt>{labels.emailDelivery.sentAt}</dt><dd>{formatTime(delivery.sentAt)}</dd></div>
                <div><dt>{labels.emailDelivery.failedAt}</dt><dd>{formatTime(delivery.failedAt)}</dd></div>
                {delivery.lastErrorCode ? <div><dt>{labels.emailDelivery.error}</dt><dd>{labels.emailDelivery.errors[delivery.lastErrorCode]}</dd></div> : null}
              </dl>
              {canManage && delivery.canRetry ? (
                <Button type="button" variant="secondary" disabled={pending} onClick={(event) => open(delivery, event)}>{labels.emailDelivery.retry}</Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <dialog ref={dialogRef} className="dashboard-order-dialog" aria-labelledby="notification-retry-title" aria-describedby="notification-retry-description" onClose={() => requestAnimationFrame(() => invokerRef.current?.focus())}>
        {selected ? (
          <form action={action} aria-busy={pending}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="notificationId" value={selected.id} />
            <input type="hidden" name="expectedVersion" value={selected.mutationVersion} />
            <input type="hidden" name="dashboardLocale" value={locale} />
            <h2 id="notification-retry-title">{labels.emailDelivery.confirmTitle}</h2>
            <p id="notification-retry-description">{labels.emailDelivery.confirmDescription}</p>
            {hasNewResult && result.status === "error" ? (
              <p ref={errorRef} className="dashboard-order-result" data-tone="error" role="alert" tabIndex={-1}>{result.code ? labels.results[result.code] : labels.results.TEMPORARY_FAILURE}</p>
            ) : null}
            <div className="dashboard-order-dialog-actions">
              <Button type="button" variant="secondary" autoFocus disabled={pending} onClick={() => dialogRef.current?.close()}>{labels.emailDelivery.cancel}</Button>
              <Button type="submit" disabled={pending}>{pending ? labels.emailDelivery.retrying : labels.emailDelivery.confirm}</Button>
            </div>
          </form>
        ) : null}
      </dialog>
    </section>
  );
}
