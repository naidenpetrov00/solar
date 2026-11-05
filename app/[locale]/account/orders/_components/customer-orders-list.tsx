import Link from "next/link";
import { ButtonLink } from "@/components/button";
import type { CustomerOrdersPage } from "@/lib/orders/customer-model";
import { customerOrderRouteSlug, customerOrdersRouteSlug, localizedPath } from "../../../_lib/routes";
import type { CustomerOrdersLabels } from "../customer-order-labels";
import { formatOrderDate, formatOrderMoney } from "../order-format";

function pageHref(locale: string, page: number) {
  const path = localizedPath(locale, customerOrdersRouteSlug);
  return page > 1 ? `${path}?page=${page}` : path;
}

function formatItemCount(locale: string, count: number, labels: CustomerOrdersLabels) {
  const category = new Intl.PluralRules(locale).select(count);
  const template = labels.list[
    `itemCount_${category}` as keyof Pick<
      CustomerOrdersLabels["list"],
      "itemCount_one" | "itemCount_few" | "itemCount_many" | "itemCount_other"
    >
  ] ?? labels.list.itemCount_other;
  return template.replace("{{count}}", new Intl.NumberFormat(locale).format(count));
}

export function CustomerOrdersList({ result, locale, labels }: {
  result: CustomerOrdersPage;
  locale: string;
  labels: CustomerOrdersLabels;
}) {
  if (!result.orders.length) {
    return <section className="customer-orders-empty" aria-labelledby="customer-orders-empty-title">
      <h2 id="customer-orders-empty-title">{labels.list.emptyTitle}</h2>
      <p>{labels.list.emptyDescription}</p>
      <ButtonLink href={localizedPath(locale, "shop")} variant="informational">{labels.list.shop}</ButtonLink>
    </section>;
  }
  return <>
    <div className="customer-orders-ledger">
      <table>
        <thead><tr>
          <th scope="col">{labels.list.orderNumber}</th><th scope="col">{labels.list.submittedAt}</th><th scope="col">{labels.list.orderStatus}</th><th scope="col">{labels.list.paymentStatus}</th><th scope="col">{labels.list.items}</th><th scope="col">{labels.list.total}</th>
        </tr></thead>
        <tbody>{result.orders.map((order) => <tr key={order.id}>
          <th scope="row"><Link href={localizedPath(locale, customerOrderRouteSlug(order.id))}>{order.orderNumber}</Link></th>
          <td><time dateTime={order.submittedAt}>{formatOrderDate(locale, order.submittedAt)}</time></td>
          <td><span className="customer-order-status" data-status={order.orderStatus}>{labels.orderStatuses[order.orderStatus]}</span></td>
          <td><span className="customer-order-status" data-status={order.paymentStatus}>{labels.paymentStatuses[order.paymentStatus]}</span></td>
          <td>{formatItemCount(locale, order.itemCount, labels)}</td>
          <td>{formatOrderMoney(locale, order.totalGrossMinor)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ol className="customer-orders-mobile-list">{result.orders.map((order) => <li key={order.id}>
      <Link href={localizedPath(locale, customerOrderRouteSlug(order.id))}>
        <span><strong>{order.orderNumber}</strong><small><time dateTime={order.submittedAt}>{formatOrderDate(locale, order.submittedAt)}</time></small></span>
        <span><small>{formatItemCount(locale, order.itemCount, labels)} · {labels.orderStatuses[order.orderStatus]} · {labels.paymentStatuses[order.paymentStatus]}</small><strong>{formatOrderMoney(locale, order.totalGrossMinor)}</strong></span>
      </Link>
    </li>)}</ol>
    {result.pageCount > 1 ? <nav className="customer-orders-pagination" aria-label={labels.list.page.replace("{{page}}", String(result.page)).replace("{{pages}}", String(result.pageCount))}>
      {result.page > 1 ? <ButtonLink href={pageHref(locale, result.page - 1)} variant="informational">{labels.list.previous}</ButtonLink> : <span />}
      <span>{labels.list.page.replace("{{page}}", String(result.page)).replace("{{pages}}", String(result.pageCount))}</span>
      {result.page < result.pageCount ? <ButtonLink href={pageHref(locale, result.page + 1)} variant="informational">{labels.list.next}</ButtonLink> : <span />}
    </nav> : null}
  </>;
}
