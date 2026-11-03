import { Button, ButtonLink } from "@/components/button";
import { formatCurrencyMinor } from "../../../_lib/catalog-format";
import {
  dashboardOrderRouteSlug,
  localizedPath,
} from "../../../_lib/routes";
import type { ManagedOrdersPage } from "@/lib/orders/management-model";
import { orderPaymentStatuses, orderStatuses } from "@/lib/orders/model";
import { DashboardSelect } from "../../_components/dashboard-select";
import type { OrdersLabels } from "../order-labels";
import { orderListHref, orderListParameters } from "../order-query-links";
import { sofiaDateTimeFormatter } from "../order-format";

export function OrdersList({
  result,
  locale,
  labels,
}: {
  result: ManagedOrdersPage;
  locale: string;
  labels: OrdersLabels;
}) {
  const listPath = localizedPath(locale, "dashboard/orders");
  const dateFormatter = sofiaDateTimeFormatter(locale);
  const detailParameters = orderListParameters(result).toString();
  return (
    <>
      <section className="dashboard-orders-toolbar" aria-label={labels.filters.regionLabel}>
        {result.invalidFilters.length ? (
          <p className="dashboard-orders-notice" role="status">{labels.filters.invalid}</p>
        ) : null}
        <form method="get" className="dashboard-orders-filters">
          <label>
            <span>{labels.filters.search}</span>
            <input
              type="search"
              name="q"
              defaultValue={result.query}
              maxLength={100}
              placeholder={labels.filters.searchPlaceholder}
            />
          </label>
          <label>
            <span>{labels.filters.status}</span>
            <DashboardSelect name="status" defaultValue={result.status ?? ""}>
              <option value="">{labels.filters.all}</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>{labels.orderStatuses[status]}</option>
              ))}
            </DashboardSelect>
          </label>
          <label>
            <span>{labels.filters.paymentStatus}</span>
            <DashboardSelect name="payment" defaultValue={result.paymentStatus ?? ""}>
              <option value="">{labels.filters.all}</option>
              {orderPaymentStatuses.map((status) => (
                <option key={status} value={status}>{labels.paymentStatuses[status]}</option>
              ))}
            </DashboardSelect>
          </label>
          <label>
            <span>{labels.filters.from}</span>
            <input type="date" name="from" defaultValue={result.from} />
          </label>
          <label>
            <span>{labels.filters.to}</span>
            <input type="date" name="to" defaultValue={result.to} />
          </label>
          <p className="dashboard-orders-filter-timezone">{labels.filters.timezone}</p>
          <div className="dashboard-orders-filter-actions">
            <Button type="submit">{labels.filters.apply}</Button>
            <ButtonLink href={listPath} variant="informational">
              {labels.filters.clear}
            </ButtonLink>
          </div>
        </form>
        <p className="dashboard-orders-count">{labels.count.replace("{{count}}", String(result.total))}</p>
      </section>

      {result.orders.length ? (
        <div className="dashboard-orders-ledger">
          <table>
            <thead><tr>
              <th scope="col">{labels.list.orderNumber}</th>
              <th scope="col">{labels.list.submittedAt}</th>
              <th scope="col">{labels.list.customer}</th>
              <th scope="col">{labels.list.total}</th>
              <th scope="col">{labels.list.orderStatus}</th>
              <th scope="col">{labels.list.paymentStatus}</th>
              <th scope="col"><span className="sr-only">{labels.list.open}</span></th>
            </tr></thead>
            <tbody>{result.orders.map((order) => {
              const path = localizedPath(locale, dashboardOrderRouteSlug(order.id));
              const href = detailParameters ? `${path}?${detailParameters}` : path;
              return <tr key={order.id}>
                <td><strong>{order.orderNumber}</strong></td>
                <td><time dateTime={order.submittedAt}>{dateFormatter.format(new Date(order.submittedAt))}</time></td>
                <td><strong>{order.customerName}</strong><span>{order.customerPhone}</span></td>
                <td>{formatCurrencyMinor(locale, order.totalGrossMinor)}</td>
                <td><span className="dashboard-order-status" data-status={order.orderStatus}>{labels.orderStatuses[order.orderStatus]}</span></td>
                <td><span className="dashboard-order-status" data-status={order.paymentStatus}>{labels.paymentStatuses[order.paymentStatus]}</span></td>
                <td><ButtonLink href={href} variant="informational">{labels.list.open}</ButtonLink></td>
              </tr>;
            })}</tbody>
          </table>
          <ul className="dashboard-orders-mobile-list">
            {result.orders.map((order) => {
              const path = localizedPath(locale, dashboardOrderRouteSlug(order.id));
              const href = detailParameters ? `${path}?${detailParameters}` : path;
              return <li key={order.id}>
                <ButtonLink href={href} variant="secondary">
                  <span>
                    <strong>{order.orderNumber}</strong>
                    <small>{order.customerName} · {order.customerPhone}</small>
                    <small><time dateTime={order.submittedAt}>{dateFormatter.format(new Date(order.submittedAt))}</time></small>
                  </span>
                  <span>
                    {formatCurrencyMinor(locale, order.totalGrossMinor)}
                    <small>{labels.orderStatuses[order.orderStatus]}</small>
                    <small>{labels.paymentStatuses[order.paymentStatus]}</small>
                  </span>
                </ButtonLink>
              </li>;
            })}
          </ul>
        </div>
      ) : (
        <section className="dashboard-orders-empty">
          <h2>{result.query || result.status || result.paymentStatus || result.from || result.to
            ? labels.noResults.title
            : labels.empty.title}</h2>
          <p>{result.query || result.status || result.paymentStatus || result.from || result.to
            ? labels.noResults.description
            : labels.empty.description}</p>
        </section>
      )}

      {result.pageCount > 1 ? (
        <nav className="dashboard-orders-pagination" aria-label={labels.pagination.label}>
          {result.page > 1
            ? <ButtonLink variant="secondary" href={orderListHref(locale, result, result.page - 1)}>{labels.pagination.previous}</ButtonLink>
            : <span />}
          <span>{labels.pagination.status
            .replace("{{page}}", String(result.page))
            .replace("{{pages}}", String(result.pageCount))}</span>
          {result.page < result.pageCount
            ? <ButtonLink variant="secondary" href={orderListHref(locale, result, result.page + 1)}>{labels.pagination.next}</ButtonLink>
            : <span />}
        </nav>
      ) : null}
    </>
  );
}
