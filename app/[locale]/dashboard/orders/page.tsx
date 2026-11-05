import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import {
  listManagedOrders,
  parseManagedOrdersQuery,
} from "@/lib/orders/management-list";
import type { ManagedOrdersRawQuery } from "@/lib/orders/management-model";
import { hasPermission } from "@/lib/permission-policy";
import { getPrivatePageMetadata } from "../../_lib/metadata";
import { localizedAuthPath } from "../../_lib/auth-routes";
import {
  accessDeniedRouteSlug,
  dashboardOrdersRouteSlug,
  localizedPath,
} from "../../_lib/routes";
import { safeAuthReturnPath } from "../../_lib/return-paths";
import { OrdersList } from "./_components/orders-list";
import type { OrdersLabels } from "./order-labels";
import { orderListHref } from "./order-query-links";

export async function generateMetadata({ params }: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPrivatePageMetadata(locale, dashboardOrdersRouteSlug, "dashboard.orders");
}

async function OrdersResults({ actorId, query, locale, labels }: {
  actorId: string;
  query: ManagedOrdersRawQuery;
  locale: string;
  labels: OrdersLabels;
}) {
  const result = await listManagedOrders(actorId, query);
  return <OrdersList result={result} locale={locale} labels={labels} />;
}

export default async function OrdersPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ManagedOrdersRawQuery>;
}) {
  const [{ locale }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const path = safeAuthReturnPath(
    orderListHref(locale, parseManagedOrdersQuery(query)),
    locale,
  );
  if (!currentUser) redirect(localizedAuthPath(locale, "sign-in", path));
  if (
    !hasPermission(currentUser.role, "dashboard:view") ||
    !hasPermission(currentUser.role, "order:view")
  ) redirect(localizedPath(locale, accessDeniedRouteSlug));
  const { t } = await getT(["common", "dashboard", "orders"], { lng: locale });
  const labels = t("orders:pages.dashboard.orders", { returnObjects: true }) as OrdersLabels;
  return (
    <main id="main-content" className="dashboard-main dashboard-orders-main">
      <header className="dashboard-introduction dashboard-orders-introduction">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
      </header>
      <Suspense fallback={<p className="dashboard-orders-loading" role="status">{labels.loading}</p>}>
        <OrdersResults actorId={currentUser.id} query={query} locale={locale} labels={labels} />
      </Suspense>
    </main>
  );
}
