import type { ManagedOrdersQuery } from "@/lib/orders/management-model";
import { dashboardOrdersRouteSlug, localizedPath } from "../../_lib/routes";

export function orderListParameters(query: ManagedOrdersQuery, page = query.page) {
  const parameters = new URLSearchParams();
  if (query.query) parameters.set("q", query.query);
  if (query.status) parameters.set("status", query.status);
  if (query.paymentStatus) parameters.set("payment", query.paymentStatus);
  if (query.from) parameters.set("from", query.from);
  if (query.to) parameters.set("to", query.to);
  if (page > 1) parameters.set("page", String(page));
  return parameters;
}

export function orderListHref(locale: string, query: ManagedOrdersQuery, page = query.page) {
  const parameters = orderListParameters(query, page).toString();
  const path = localizedPath(locale, dashboardOrdersRouteSlug);
  return parameters ? `${path}?${parameters}` : path;
}
