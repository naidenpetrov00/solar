import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { listNotificationRecipients } from "@/lib/order-notifications/recipient-management";
import { hasPermission } from "@/lib/permission-policy";
import { localizedAuthPath } from "../../../_lib/auth-routes";
import { getPrivatePageMetadata } from "../../../_lib/metadata";
import {
  accessDeniedRouteSlug,
  dashboardOrderRecipientsRouteSlug,
  dashboardOrdersRouteSlug,
  localizedPath,
} from "../../../_lib/routes";
import { safeAuthReturnPath } from "../../../_lib/return-paths";
import {
  RecipientManager,
  type RecipientLabels,
} from "./_components/recipient-manager";

export async function generateMetadata({ params }: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPrivatePageMetadata(
    locale,
    dashboardOrderRecipientsRouteSlug,
    "dashboard.orderRecipients",
  );
}

export default async function OrderRecipientsPage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const route = localizedPath(locale, dashboardOrderRecipientsRouteSlug);
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(localizedAuthPath(locale, "sign-in", safeAuthReturnPath(route, locale)));
  }
  if (
    !hasPermission(currentUser.role, "dashboard:view") ||
    !hasPermission(currentUser.role, "order:view")
  ) redirect(localizedPath(locale, accessDeniedRouteSlug));
  const [{ t }, recipients] = await Promise.all([
    getT(["common", "dashboard", "orders"], { lng: locale }),
    listNotificationRecipients(currentUser.id),
  ]);
  const labels = t("orders:pages.dashboard.orders.recipients", {
    returnObjects: true,
  }) as RecipientLabels;
  const hasActiveRecipients = recipients.some((recipient) => recipient.active);
  return (
    <main id="main-content" className="dashboard-main dashboard-order-recipients-main">
      <ButtonLink href={localizedPath(locale, dashboardOrdersRouteSlug)} variant="informational" className="dashboard-order-back">{labels.back}</ButtonLink>
      <header className="dashboard-introduction">
        <div><h1>{labels.title}</h1><p>{labels.description}</p></div>
      </header>
      {!hasActiveRecipients ? <p className="dashboard-orders-notice" role="status">{labels.warning}</p> : null}
      <RecipientManager
        recipients={recipients}
        locale={locale}
        canManage={hasPermission(currentUser.role, "order:manage")}
        labels={labels}
      />
    </main>
  );
}
