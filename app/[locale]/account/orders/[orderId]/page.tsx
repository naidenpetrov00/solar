import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { OrderError } from "@/lib/orders/errors";
import { getCurrentCustomerOrderDetail } from "@/lib/orders/customer-detail";
import { localizedAuthPath } from "../../../_lib/auth-routes";
import { customerOrderRouteSlug, localizedPath } from "../../../_lib/routes";
import { safeAuthReturnPath } from "../../../_lib/return-paths";
import { CustomerOrderDetailView } from "../_components/customer-order-detail";
import type { CustomerOrdersLabels } from "../customer-order-labels";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getT("customerOrders", { lng: locale });
  return {
    title: t("page.detailTitle"),
    description: t("page.detailDescription"),
    alternates: { canonical: null, languages: null },
    robots: { index: false, follow: false },
  };
}

export default async function CustomerOrderDetailPage({ params }: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const [{ locale, orderId }, currentUser] = await Promise.all([params, getCurrentUser()]);
  const path = safeAuthReturnPath(localizedPath(locale, customerOrderRouteSlug(orderId)), locale);
  if (!currentUser) redirect(localizedAuthPath(locale, "sign-in", path));
  let order;
  try {
    order = await getCurrentCustomerOrderDetail(orderId);
  } catch (error) {
    if (error instanceof OrderError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { t } = await getT("customerOrders", { lng: locale });
  const labels = t("page", { returnObjects: true }) as CustomerOrdersLabels;
  return <main id="main-content" className="customer-orders-main customer-order-detail-main">
    <CustomerOrderDetailView order={order} locale={locale} labels={labels} />
  </main>;
}
