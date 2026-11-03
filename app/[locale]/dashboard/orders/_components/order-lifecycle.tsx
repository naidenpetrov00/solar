"use client";

import { useActionState, useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/button";
import {
  canTransitionOrder,
  canTransitionPayment,
  orderPaymentStatuses,
  orderStatuses,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/lib/orders/model";
import { transitionOrderAction, transitionPaymentAction } from "../actions";
import {
  initialOrderActionResult,
  type OrderActionResult,
} from "../order-action-model";
import type { OrdersLabels } from "../order-labels";

type Confirmation =
  | { kind: "order"; value: OrderStatus }
  | { kind: "payment"; value: OrderPaymentStatus };

export function OrderLifecycle({
  orderId,
  orderStatus,
  paymentStatus,
  mutationVersion,
  dashboardLocale,
  dirty,
  labels,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  mutationVersion: number;
  dashboardLocale: string;
  dirty: boolean;
  labels: OrdersLabels;
}) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [orderResult, orderAction, orderPending] = useActionState(
    transitionOrderAction,
    initialOrderActionResult,
  );
  const [paymentResult, paymentAction, paymentPending] = useActionState(
    transitionPaymentAction,
    initialOrderActionResult,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultAtOpenRef = useRef<OrderActionResult>(initialOrderActionResult);
  const orderOptions = orderStatuses.filter((status) => canTransitionOrder(orderStatus, status));
  const paymentOptions = orderPaymentStatuses.filter((status) =>
    canTransitionPayment(paymentStatus, status),
  );
  const activeResult = confirmation?.kind === "payment" ? paymentResult : orderResult;
  const hasNewResult = confirmation !== null && activeResult !== resultAtOpenRef.current;
  const pending = orderPending || paymentPending;

  useEffect(() => {
    if (!hasNewResult) return;
    if (activeResult.status === "success") {
      dialogRef.current?.close();
    } else if (activeResult.status === "error") {
      errorRef.current?.focus();
    }
  }, [activeResult, hasNewResult]);

  const open = (next: Confirmation, event: MouseEvent<HTMLButtonElement>) => {
    invokerRef.current = event.currentTarget;
    resultAtOpenRef.current = next.kind === "payment" ? paymentResult : orderResult;
    setConfirmation(next);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  };
  const label = confirmation?.kind === "order"
    ? labels.orderStatuses[confirmation.value]
    : confirmation?.kind === "payment"
      ? labels.paymentStatuses[confirmation.value]
      : "";
  const announcedResult = pending
    ? labels.lifecycle.updating
    : orderResult.status === "success" && orderResult.code
      ? labels.results[orderResult.code]
      : paymentResult.status === "success" && paymentResult.code
        ? labels.results[paymentResult.code]
        : "";

  return (
    <section className="dashboard-order-lifecycle" aria-labelledby="order-lifecycle-title">
      <h2 ref={headingRef} id="order-lifecycle-title" tabIndex={-1}>{labels.detail.lifecycle}</h2>
      <span className="sr-only" role="status" aria-live="polite">{announcedResult}</span>
      {dirty ? <p className="dashboard-orders-notice">{labels.lifecycle.unsavedBlocked}</p> : null}
      <div className="dashboard-order-lifecycle-columns">
        <section aria-labelledby="order-status-actions-title">
          <h3 id="order-status-actions-title">{labels.lifecycle.orderTitle}</h3>
          <p>{labels.lifecycle.orderDescription}</p>
          <div className="dashboard-order-lifecycle-actions">
            {orderOptions.length ? orderOptions.map((status) => (
              <Button
                key={status}
                type="button"
                variant="secondary"
                tone={status === "rejected" || status === "cancelled" ? "danger" : "default"}
                disabled={dirty || pending}
                onClick={(event) => open({ kind: "order", value: status }, event)}
              >
                {labels.orderStatuses[status]}
              </Button>
            )) : <p>{labels.lifecycle.noTransitions}</p>}
          </div>
        </section>
        <section aria-labelledby="payment-status-actions-title">
          <h3 id="payment-status-actions-title">{labels.lifecycle.paymentTitle}</h3>
          <p>{labels.lifecycle.paymentDescription}</p>
          <div className="dashboard-order-lifecycle-actions">
            {paymentOptions.length ? paymentOptions.map((status) => (
              <Button
                key={status}
                type="button"
                variant="secondary"
                disabled={dirty || pending}
                onClick={(event) => open({ kind: "payment", value: status }, event)}
              >
                {labels.paymentStatuses[status]}
              </Button>
            )) : <p>{labels.lifecycle.noTransitions}</p>}
          </div>
        </section>
      </div>

      <dialog
        ref={dialogRef}
        className="dashboard-order-dialog"
        aria-labelledby="order-transition-dialog-title"
        aria-describedby="order-transition-dialog-description"
        onClose={() => requestAnimationFrame(() => {
          if (invokerRef.current?.isConnected) invokerRef.current.focus();
          else headingRef.current?.focus();
        })}
      >
        {confirmation ? (
          <form
            action={confirmation.kind === "order" ? orderAction : paymentAction}
            aria-busy={pending}
          >
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="expectedVersion" value={mutationVersion} />
            <input type="hidden" name="dashboardLocale" value={dashboardLocale} />
            {confirmation.kind === "order"
              ? <input type="hidden" name="status" value={confirmation.value} />
              : <input type="hidden" name="paymentStatus" value={confirmation.value} />}
            <h2 id="order-transition-dialog-title">{labels.lifecycle.confirmTitle}</h2>
            <p id="order-transition-dialog-description">
              {labels.lifecycle.confirmDescription.replace("{{status}}", label)}
            </p>
            {hasNewResult && activeResult.status === "error" ? (
              <p ref={errorRef} className="dashboard-order-result" data-tone="error" role="alert" tabIndex={-1}>
                {activeResult.code ? labels.results[activeResult.code] : labels.results.TEMPORARY_FAILURE}
              </p>
            ) : null}
            <div className="dashboard-order-dialog-actions">
              <Button
                type="button"
                variant="secondary"
                autoFocus
                disabled={pending}
                onClick={() => dialogRef.current?.close()}
              >
                {labels.lifecycle.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? labels.lifecycle.updating : labels.lifecycle.confirm}
              </Button>
            </div>
          </form>
        ) : null}
      </dialog>
    </section>
  );
}
