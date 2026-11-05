import { ButtonLink } from "@/components/button";
import type { ReactNode } from "react";
import type { CustomerOrderDetail } from "@/lib/orders/customer-model";
import { customerOrdersRouteSlug, localizedPath } from "../../../_lib/routes";
import type { CustomerOrdersLabels } from "../customer-order-labels";
import { formatOrderDate, formatOrderMoney } from "../order-format";

type TimelineEntry = { key: string; value: string; priority: number };

function timeline(order: CustomerOrderDetail, labels: CustomerOrdersLabels) {
  const entries: TimelineEntry[] = [
    { key: "submitted", value: order.submittedAt, priority: 0 },
    ...(order.approvedAt ? [{ key: "approved", value: order.approvedAt, priority: 1 }] : []),
    ...(order.rejectedAt ? [{ key: "rejected", value: order.rejectedAt, priority: 1 }] : []),
    ...(order.cancelledAt ? [{ key: "cancelled", value: order.cancelledAt, priority: 1 }] : []),
    ...(order.completedAt ? [{ key: "completed", value: order.completedAt, priority: 1 }] : []),
    ...(order.paidAt ? [{ key: "paid", value: order.paidAt, priority: 2 }] : []),
    ...(order.refundedAt ? [{ key: "refunded", value: order.refundedAt, priority: 2 }] : []),
    ...(order.paymentStatusUpdatedAt !== order.submittedAt ? [{ key: "payment", value: order.paymentStatusUpdatedAt, priority: 3 }] : []),
  ];
  const labelsByKey = {
    submitted: labels.detail.timelineSubmitted,
    approved: labels.detail.timelineApproved,
    rejected: labels.detail.timelineRejected,
    cancelled: labels.detail.timelineCancelled,
    completed: labels.detail.timelineCompleted,
    paid: labels.detail.timelinePaid,
    refunded: labels.detail.timelineRefunded,
    payment: labels.detail.timelinePaymentUpdated,
  };
  return entries
    .sort((a, b) => a.value.localeCompare(b.value) || a.priority - b.priority)
    .filter((entry, index, values) => index === 0 || entry.value !== values[index - 1]?.value)
    .map((entry) => ({ ...entry, label: labelsByKey[entry.key as keyof typeof labelsByKey] }));
}

function DefinitionRows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <dl className="customer-order-definition-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function CustomerOrderDetailView({ order, locale, labels }: {
  order: CustomerOrderDetail;
  locale: string;
  labels: CustomerOrdersLabels;
}) {
  const timelineEntries = timeline(order, labels);
  const money = (minor: string) => formatOrderMoney(locale, minor);
  return <>
    <div className="customer-order-back"><ButtonLink href={localizedPath(locale, customerOrdersRouteSlug)} variant="informational">{labels.detail.back}</ButtonLink></div>
    <header className="customer-order-header">
      <div><h1>{order.orderNumber}</h1><p>{labels.detail.submittedAt}: <time dateTime={order.submittedAt}>{formatOrderDate(locale, order.submittedAt)}</time></p></div>
      <DefinitionRows rows={[
        [labels.list.orderStatus, <span className="customer-order-status" data-status={order.status}>{labels.orderStatuses[order.status]}</span>],
        [labels.list.paymentStatus, <span className="customer-order-status" data-status={order.paymentStatus}>{labels.paymentStatuses[order.paymentStatus]}</span>],
        [labels.detail.updatedAt, <time dateTime={order.updatedAt}>{formatOrderDate(locale, order.updatedAt)}</time>],
        [labels.detail.paymentUpdatedAt, <time dateTime={order.paymentStatusUpdatedAt}>{formatOrderDate(locale, order.paymentStatusUpdatedAt)}</time>],
      ]} />
    </header>
    <section className="customer-order-section customer-order-detail-grid" aria-labelledby="customer-order-customer-title">
      <div><h2 id="customer-order-customer-title">{labels.detail.customerDelivery}</h2><DefinitionRows rows={[
        [labels.detail.customerName, order.customer.name], [labels.detail.phone, order.customer.phone], [labels.detail.email, order.customer.email], [labels.detail.city, order.customer.city], [labels.detail.deliveryAddress, order.customer.deliveryAddress], [labels.detail.note, order.customer.note ?? labels.detail.noNote],
      ]} /></div>
      <div><h2>{labels.detail.paymentMethod}</h2><DefinitionRows rows={[[labels.detail.paymentMethod, labels.paymentMethods[order.paymentMethod]]]} /></div>
    </section>
    <section className="customer-order-section" aria-labelledby="customer-order-timeline-title"><h2 id="customer-order-timeline-title">{labels.detail.timeline}</h2><ol className="customer-order-timeline">{timelineEntries.map((entry) => <li key={`${entry.key}-${entry.value}`}><strong>{entry.label}</strong><time dateTime={entry.value}>{formatOrderDate(locale, entry.value)}</time></li>)}</ol></section>
    <section className="customer-order-section" aria-labelledby="customer-order-items-title"><h2 id="customer-order-items-title">{labels.detail.items}</h2>
      <div className="customer-order-items-table"><table><thead><tr><th scope="col">{labels.detail.items}</th><th scope="col">{labels.detail.quantity}</th><th scope="col">{labels.detail.unitGross}</th><th scope="col">{labels.detail.lineGross}</th></tr></thead><tbody>{order.items.map((item) => <tr key={`${item.sku}-${item.title}`}><th scope="row">{item.title}<span>{labels.detail.sku}: {item.sku}</span>{item.promotionLabel ? <span>{labels.detail.promotion}: {item.promotionLabel}</span> : null}<span>{labels.detail.vatRate}: {(item.vatRateBasisPoints / 100).toFixed(2)}%</span></th><td>{item.quantity}</td><td><span>{labels.detail.unitNet}: {money(item.finalUnitNetMinor)}</span><span>{labels.detail.unitVat}: {money(item.finalUnitVatMinor)}</span><strong>{money(item.finalUnitGrossMinor)}</strong></td><td><span>{labels.detail.lineNet}: {money(item.lineNetMinor)}</span><span>{labels.detail.lineVat}: {money(item.lineVatMinor)}</span><strong>{money(item.lineGrossMinor)}</strong></td></tr>)}</tbody></table></div>
    </section>
    <section className="customer-order-section" aria-labelledby="customer-order-totals-title"><h2 id="customer-order-totals-title">{labels.detail.totals}</h2><DefinitionRows rows={[
      [labels.detail.catalogSubtotal, money(order.totals.catalogSubtotalGrossMinor)], [labels.detail.promotionDiscount, money((-BigInt(order.totals.promotionDiscountGrossMinor)).toString())], [labels.detail.itemAdjustments, money(order.totals.itemAdjustmentGrossMinor)], [labels.detail.itemsNet, money(order.totals.itemsNetMinor)], [labels.detail.itemsVat, money(order.totals.itemsVatMinor)], [labels.detail.itemsGross, money(order.totals.itemsGrossMinor)], [labels.detail.orderAdjustmentNet, money(order.totals.orderAdjustmentNetMinor)], [labels.detail.orderAdjustmentVat, money(order.totals.orderAdjustmentVatMinor)], [labels.detail.orderAdjustmentGross, money(order.totals.orderAdjustmentGrossMinor)], [labels.detail.totalNet, money(order.totals.totalNetMinor)], [labels.detail.totalVat, money(order.totals.totalVatMinor)], [labels.detail.totalGross, <strong>{money(order.totals.totalGrossMinor)}</strong>],
    ]} /></section>
  </>;
}
