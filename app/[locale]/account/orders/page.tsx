import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { listCurrentCustomerOrders } from "@/lib/orders/customer-list";
import type { CustomerOrdersRawQuery } from "@/lib/orders/customer-model";
import { localizedAuthPath } from "../../_lib/auth-routes";
import { customerOrdersRouteSlug, localizedPath } from "../../_lib/routes";
import { safeAuthReturnPath } from "../../_lib/return-paths";
import { CustomerOrdersList } from "./_components/customer-orders-list";
import type { CustomerOrdersLabels } from "./customer-order-labels";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getT("customerOrders", { lng: locale });
  return {
    title: t("page.listTitle"),
    description: t("page.listDescription"),
    alternates: { canonical: null, languages: null },
    robots: { index: false, follow: false },
  };
}

function returnPath(locale: string, query: CustomerOrdersRawQuery) {
  const path = localizedPath(locale, customerOrdersRouteSlug);
  const page = typeof query.page === "string" && /^\d+$/u.test(query.page)
    ? `?page=${query.page}`
    : "";
  return safeAuthReturnPath(`${path}${page}`, locale);
}

export default async function CustomerOrdersPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CustomerOrdersRawQuery>;
}) {
  const [{ locale }, query, currentUser] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!currentUser) redirect(localizedAuthPath(locale, "sign-in", returnPath(locale, query)));
  const [result, { t }] = await Promise.all([
    listCurrentCustomerOrders(query),
    getT("customerOrders", { lng: locale }),
  ]);
  const labels = t("page", { returnObjects: true }) as CustomerOrdersLabels;
  return <main id="main-content" className="customer-orders-main">
    <header className="customer-orders-introduction"><h1>{labels.list.title}</h1><p>{labels.list.description}</p></header>
    <CustomerOrdersList result={result} locale={locale} labels={labels} />
  </main>;
}
