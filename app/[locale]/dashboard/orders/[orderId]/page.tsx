import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ButtonLink } from "@/components/button";

import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { isUuid } from "@/lib/catalog/model";
import { OrderError } from "@/lib/orders/errors";
import { getManagedOrderDetail } from "@/lib/orders/management-detail";
import { parseManagedOrdersQuery } from "@/lib/orders/management-list";
import type { ManagedOrdersRawQuery } from "@/lib/orders/management-model";
import { hasPermission } from "@/lib/permission-policy";
import { localizedAuthPath } from "../../../_lib/auth-routes";
import { getPrivatePageMetadata } from "../../../_lib/metadata";
import {
  accessDeniedRouteSlug,
  dashboardOrderRecipientsRouteSlug,
  dashboardOrderRouteSlug,
  localizedPath,
} from "../../../_lib/routes";
import { safeAuthReturnPath } from "../../../_lib/return-paths";
import { OrderHistory } from "../_components/order-history";
import { OrderEmailDeliveries } from "../_components/order-email-deliveries";
import { OrderManagementWorkspace } from "../_components/order-management-workspace";
import { OrderRevisionView } from "../_components/order-revision-view";
import { sofiaDateTimeFormatter } from "../order-format";
import type { OrdersLabels } from "../order-labels";
import { orderListHref, orderListParameters } from "../order-query-links";

export async function generateMetadata({ params }: {
  params: Promise<{ locale: string; orderId: string }>;
}): Promise<Metadata> {
  const { locale, orderId } = await params;
  return getPrivatePageMetadata(
    locale,
    dashboardOrderRouteSlug(orderId),
    "dashboard.orderDetail",
  );
}

async function OrderDetailContent({
  actorId,
  orderId,
  locale,
  canManage,
  backHref,
  labels,
}: {
  actorId: string;
  orderId: string;
  locale: string;
  canManage: boolean;
  backHref: string;
  labels: OrdersLabels;
}) {
  let order;
  try {
    order = await getManagedOrderDetail(actorId, orderId);
  } catch (error) {
    if (error instanceof OrderError && error.code === "NOT_FOUND") notFound();
    if (error instanceof OrderError && error.code === "FORBIDDEN") {
      redirect(localizedPath(locale, accessDeniedRouteSlug));
    }
    throw error;
  }
  const dateFormatter = sofiaDateTimeFormatter(locale);
  const latestHref = localizedPath(locale, dashboardOrderRouteSlug(order.id));
  return (
    <>
      <div className="dashboard-order-detail-actions">
        <ButtonLink href={backHref} variant="informational">
          {labels.detail.back}
        </ButtonLink>
        <ButtonLink href={localizedPath(locale, dashboardOrderRecipientsRouteSlug)} variant="informational">
          {labels.emailDelivery.manageRecipients}
        </ButtonLink>
      </div>
      <header className="dashboard-order-header">
        <div><h1>{order.orderNumber}</h1><p>
          {labels.detail.submittedAt}: <time dateTime={order.submittedAt}>{dateFormatter.format(new Date(order.submittedAt))}</time>
        </p></div>
        <dl>
          <div><dt>{labels.list.orderStatus}</dt><dd><span className="dashboard-order-status" data-status={order.status}>{labels.orderStatuses[order.status]}</span></dd></div>
          <div><dt>{labels.list.paymentStatus}</dt><dd><span className="dashboard-order-status" data-status={order.paymentStatus}>{labels.paymentStatuses[order.paymentStatus]}</span></dd></div>
          <div><dt>{labels.detail.updatedAt}</dt><dd><time dateTime={order.updatedAt}>{dateFormatter.format(new Date(order.updatedAt))}</time></dd></div>
          <div><dt>{labels.detail.paymentUpdatedAt}</dt><dd><time dateTime={order.paymentStatusUpdatedAt}>{dateFormatter.format(new Date(order.paymentStatusUpdatedAt))}</time></dd></div>
          {order.approvedAt ? <div><dt>{labels.detail.approvedAt}</dt><dd><time dateTime={order.approvedAt}>{dateFormatter.format(new Date(order.approvedAt))}</time></dd></div> : null}
          {order.rejectedAt ? <div><dt>{labels.detail.rejectedAt}</dt><dd><time dateTime={order.rejectedAt}>{dateFormatter.format(new Date(order.rejectedAt))}</time></dd></div> : null}
          {order.cancelledAt ? <div><dt>{labels.detail.cancelledAt}</dt><dd><time dateTime={order.cancelledAt}>{dateFormatter.format(new Date(order.cancelledAt))}</time></dd></div> : null}
          {order.completedAt ? <div><dt>{labels.detail.completedAt}</dt><dd><time dateTime={order.completedAt}>{dateFormatter.format(new Date(order.completedAt))}</time></dd></div> : null}
          {order.paidAt ? <div><dt>{labels.detail.paidAt}</dt><dd><time dateTime={order.paidAt}>{dateFormatter.format(new Date(order.paidAt))}</time></dd></div> : null}
          {order.refundedAt ? <div><dt>{labels.detail.refundedAt}</dt><dd><time dateTime={order.refundedAt}>{dateFormatter.format(new Date(order.refundedAt))}</time></dd></div> : null}
          <div><dt>{labels.detail.currentRevision}</dt><dd>{order.currentRevisionNumber}</dd></div>
        </dl>
      </header>

      <OrderRevisionView
        revision={order.originalRevision}
        locale={locale}
        labels={labels}
        title={labels.detail.original}
        description={labels.detail.originalDescription}
      />
      {canManage && order.status === "pending_approval" ? (
        <OrderManagementWorkspace
          order={order}
          dashboardLocale={locale}
          latestHref={latestHref}
          labels={labels}
        />
      ) : (
        <>
          <OrderRevisionView
            revision={order.currentRevision}
            locale={locale}
            labels={labels}
            title={labels.detail.current}
            description={labels.detail.currentDescription}
          />
          {canManage ? (
            <OrderManagementWorkspace
              order={order}
              dashboardLocale={locale}
              latestHref={latestHref}
              labels={labels}
            />
          ) : null}
        </>
      )}
      <OrderEmailDeliveries
        orderId={order.id}
        deliveries={order.emailDeliveries}
        locale={locale}
        canManage={canManage}
        labels={labels}
      />
      <OrderHistory
        revisions={order.revisions}
        events={order.auditEvents}
        locale={locale}
        labels={labels}
      />
    </>
  );
}

export default async function OrderDetailPage({ params, searchParams }: {
  params: Promise<{ locale: string; orderId: string }>;
  searchParams: Promise<ManagedOrdersRawQuery>;
}) {
  const [{ locale, orderId }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const parsedListQuery = parseManagedOrdersQuery(query);
  const listParameters = orderListParameters(parsedListQuery).toString();
  const detailRoute = localizedPath(locale, dashboardOrderRouteSlug(orderId));
  const detailPath = safeAuthReturnPath(
    `${detailRoute}${listParameters ? `?${listParameters}` : ""}`,
    locale,
  );
  if (!currentUser) redirect(localizedAuthPath(locale, "sign-in", detailPath));
  if (
    !hasPermission(currentUser.role, "dashboard:view") ||
    !hasPermission(currentUser.role, "order:view")
  ) redirect(localizedPath(locale, accessDeniedRouteSlug));
  if (!isUuid(orderId)) notFound();
  const { t } = await getT(["common", "dashboard", "orders"], { lng: locale });
  const labels = t("orders:pages.dashboard.orders", { returnObjects: true }) as OrdersLabels;
  const backHref = orderListHref(locale, parsedListQuery);
  return (
    <main id="main-content" className="dashboard-main dashboard-order-detail-main">
      <Suspense fallback={<p className="dashboard-orders-loading" role="status">{labels.loading}</p>}>
        <OrderDetailContent
          actorId={currentUser.id}
          orderId={orderId}
          locale={locale}
          canManage={hasPermission(currentUser.role, "order:manage")}
          backHref={backHref}
          labels={labels}
        />
      </Suspense>
    </main>
  );
}
