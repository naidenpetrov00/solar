import { formatCurrencyMinor } from "../../../_lib/catalog-format";
import type { ManagedOrderRevision } from "@/lib/orders/management-model";
import type { OrdersLabels } from "../order-labels";
import { formatPercentBasisPoints, sofiaDateTimeFormatter } from "../order-format";

export function OrderRevisionView({
  revision,
  locale,
  labels,
  title,
  description,
}: {
  revision: ManagedOrderRevision;
  locale: string;
  labels: OrdersLabels;
  title: string;
  description?: string;
}) {
  const dateFormatter = sofiaDateTimeFormatter(locale);
  return (
    <section className="dashboard-order-revision">
      <header className="dashboard-order-section-heading">
        <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
        <span>{labels.detail.revision.replace("{{number}}", String(revision.revisionNumber))}</span>
      </header>
      <div className="dashboard-order-revision-grid">
        <section><h3>{labels.detail.customer}</h3><dl>
          <div><dt>{labels.detail.name}</dt><dd>{revision.customer.name}</dd></div>
          <div><dt>{labels.detail.phone}</dt><dd>{revision.customer.phone}</dd></div>
          <div><dt>{labels.detail.email}</dt><dd>{revision.customer.email}</dd></div>
          <div><dt>{labels.detail.note}</dt><dd>{revision.customer.note ?? labels.detail.noNote}</dd></div>
        </dl></section>
        <section><h3>{labels.detail.delivery}</h3><dl>
          <div><dt>{labels.detail.city}</dt><dd>{revision.customer.city}</dd></div>
          <div><dt>{labels.detail.deliveryAddress}</dt><dd>{revision.customer.deliveryAddress}</dd></div>
          <div><dt>{labels.detail.paymentMethod}</dt><dd>{labels.paymentMethods[revision.paymentMethod]}</dd></div>
          <div><dt>{labels.fields.locale}</dt><dd>{revision.locale.toUpperCase()}</dd></div>
          <div><dt>{labels.detail.createdAt}</dt><dd><time dateTime={revision.createdAt}>{dateFormatter.format(new Date(revision.createdAt))}</time></dd></div>
          <div><dt>{labels.detail.actor}</dt><dd>{revision.actor.kind === "guest" ? labels.detail.guest : `${revision.actor.name} · ${revision.actor.email}`}</dd></div>
        </dl></section>
      </div>
      <section className="dashboard-order-revision-products">
        <h3>{labels.detail.products}</h3>
        <div className="dashboard-order-items-table"><table>
          <thead><tr>
            <th scope="col">{labels.detail.products}</th>
            <th scope="col">{labels.detail.quantity}</th>
            <th scope="col">{labels.detail.unitPrice}</th>
            <th scope="col">{labels.detail.vat}</th>
            <th scope="col">{labels.detail.lineTotal}</th>
          </tr></thead>
          <tbody>{revision.items.map((item) => <tr key={item.lineKey}>
            <td>
              <strong>{item.title}</strong>
              <span>{labels.detail.sku}: {item.sku}</span>
              <span>{[item.promotionLabel, item.promotionInternalName].filter(Boolean).join(" · ") || labels.detail.noPromotion}</span>
            </td>
            <td>{item.quantity}</td>
            <td>{formatCurrencyMinor(locale, item.finalUnitGrossMinor)}</td>
            <td>{formatPercentBasisPoints(item.vatRateBasisPoints, locale)}</td>
            <td>{formatCurrencyMinor(locale, item.lineGrossMinor)}</td>
          </tr>)}</tbody>
        </table></div>
        {revision.items.some(({ adjustments }) => adjustments.length) ? (
          <div className="dashboard-order-adjustment-history">
            <h4>{labels.detail.itemAdjustments}</h4>
            {revision.items.flatMap((item) => item.adjustments.map((adjustment) => (
              <p key={adjustment.adjustmentKey}>
                <strong>{item.title}: {formatCurrencyMinor(locale, adjustment.amountGrossMinor)}</strong>
                <span>{adjustment.reason} · {adjustment.actor.name}</span>
              </p>
            )))}
          </div>
        ) : null}
      </section>
      <section className="dashboard-order-revision-totals" aria-label={labels.detail.pricing}>
        <dl>
          <div><dt>{labels.detail.subtotal}</dt><dd>{formatCurrencyMinor(locale, revision.totals.catalogSubtotalGrossMinor)}</dd></div>
          <div><dt>{labels.detail.promotionDiscount}</dt><dd>{formatCurrencyMinor(locale, `-${revision.totals.promotionDiscountGrossMinor}`)}</dd></div>
          <div><dt>{labels.detail.itemAdjustments}</dt><dd>{formatCurrencyMinor(locale, revision.totals.itemAdjustmentGrossMinor)}</dd></div>
          <div><dt>{labels.detail.orderAdjustments}</dt><dd>{formatCurrencyMinor(locale, revision.totals.orderAdjustmentGrossMinor)}</dd></div>
          <div><dt>{labels.detail.net}</dt><dd>{formatCurrencyMinor(locale, revision.totals.totalNetMinor)}</dd></div>
          <div><dt>{labels.detail.vatTotal}</dt><dd>{formatCurrencyMinor(locale, revision.totals.totalVatMinor)}</dd></div>
          <div className="dashboard-order-total"><dt>{labels.detail.total}</dt><dd>{formatCurrencyMinor(locale, revision.totals.totalGrossMinor)}</dd></div>
        </dl>
        {revision.orderAdjustments.map((adjustment) => (
          <p key={adjustment.adjustmentKey}>
            <strong>{formatCurrencyMinor(locale, adjustment.amountGrossMinor)}</strong>
            <span>{adjustment.reason} · {adjustment.actor.name}</span>
          </p>
        ))}
      </section>
    </section>
  );
}
