import { formatCurrencyMinor } from "../../../_lib/catalog-format";
import type {
  ManagedOrderAuditChange,
  ManagedOrderAuditEvent,
  ManagedOrderRevision,
} from "@/lib/orders/management-model";
import type { OrdersLabels } from "../order-labels";
import {
  formatManagedOrderActor,
  sofiaDateTimeFormatter,
} from "../order-format";
import { OrderRevisionView } from "./order-revision-view";

function changeDescription(change: ManagedOrderAuditChange, locale: string, labels: OrdersLabels) {
  const field = labels.fields[change.field] ?? labels.history.unknownChange;
  if (change.kind === "money") {
    return labels.history.moneyChange
      .replace("{{field}}", field)
      .replace("{{before}}", formatCurrencyMinor(locale, change.beforeMinor))
      .replace("{{after}}", formatCurrencyMinor(locale, change.afterMinor));
  }
  if (change.kind === "collection") {
    return labels.history.collectionChange
      .replace("{{field}}", field)
      .replace("{{before}}", String(change.beforeCount))
      .replace("{{after}}", String(change.afterCount));
  }
  if (change.kind === "value") {
    const localizedValue = (value: string | null) => {
      if (value === null) return "—";
      if (change.field === "status" && value in labels.orderStatuses) {
        return labels.orderStatuses[value as keyof typeof labels.orderStatuses];
      }
      if (change.field === "paymentStatus" && value in labels.paymentStatuses) {
        return labels.paymentStatuses[value as keyof typeof labels.paymentStatuses];
      }
      if (change.field === "paymentMethod" && value in labels.paymentMethods) {
        return labels.paymentMethods[value as keyof typeof labels.paymentMethods];
      }
      return value;
    };
    return labels.history.valueChange
      .replace("{{field}}", field)
      .replace("{{before}}", localizedValue(change.before))
      .replace("{{after}}", localizedValue(change.after));
  }
  return labels.history.unknownChange.replace("{{field}}", field);
}

function eventTitle(event: ManagedOrderAuditEvent, labels: OrdersLabels) {
  if (event.eventType === "submitted") return labels.history.submitted;
  if (event.eventType === "content_revised") return labels.history.contentRevised;
  if (event.eventType === "order_status_changed") return labels.history.orderStatusChanged;
  return labels.history.paymentStatusChanged;
}

export function OrderHistory({
  revisions,
  events,
  locale,
  labels,
}: {
  revisions: ManagedOrderRevision[];
  events: ManagedOrderAuditEvent[];
  locale: string;
  labels: OrdersLabels;
}) {
  const dateFormatter = sofiaDateTimeFormatter(locale);
  return (
    <div className="dashboard-order-history-grid">
      <section className="dashboard-order-history" aria-labelledby="revision-history-title">
        <h2 id="revision-history-title">{labels.detail.history}</h2>
        {revisions.map((revision) => (
          <details key={revision.revisionNumber}>
            <summary>
              <span>{labels.detail.revision.replace("{{number}}", String(revision.revisionNumber))}</span>
              <time dateTime={revision.createdAt}>{dateFormatter.format(new Date(revision.createdAt))}</time>
            </summary>
            <OrderRevisionView
              revision={revision}
              locale={locale}
              labels={labels}
              title={labels.detail.revision.replace("{{number}}", String(revision.revisionNumber))}
            />
          </details>
        ))}
      </section>
      <section className="dashboard-order-audit" aria-labelledby="audit-history-title">
        <h2 id="audit-history-title">{labels.detail.audit}</h2>
        <ol>{events.map((event) => <li key={event.id}>
          <header><strong>{eventTitle(event, labels)}</strong><span>{labels.history.version.replace("{{version}}", String(event.mutationVersion))}</span></header>
          <time dateTime={event.occurredAt}>{dateFormatter.format(new Date(event.occurredAt))}</time>
          <p>{formatManagedOrderActor(event.actor, labels.detail)}</p>
          {event.fromOrderStatus && event.toOrderStatus ? <p>
            {labels.orderStatuses[event.fromOrderStatus]} → {labels.orderStatuses[event.toOrderStatus]}
          </p> : null}
          {event.fromPaymentStatus && event.toPaymentStatus ? <p>
            {labels.paymentStatuses[event.fromPaymentStatus]} → {labels.paymentStatuses[event.toPaymentStatus]}
          </p> : null}
          {event.fromRevisionNumber &&
          event.toRevisionNumber &&
          event.fromRevisionNumber !== event.toRevisionNumber ? <p>
            {labels.history.revisionTransition
              .replace("{{before}}", String(event.fromRevisionNumber))
              .replace("{{after}}", String(event.toRevisionNumber))}
          </p> : null}
          {event.changes.length ? <ul>{event.changes.map((change, index) => (
            <li key={`${event.id}-${change.field}-${index}`}>{changeDescription(change, locale, labels)}</li>
          ))}</ul> : null}
        </li>)}</ol>
      </section>
    </div>
  );
}
