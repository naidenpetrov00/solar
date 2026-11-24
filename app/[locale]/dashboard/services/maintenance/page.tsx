import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { MaintenanceError } from "@/lib/maintenance/errors";
import { getManagedMaintenanceServices } from "@/lib/maintenance/management";
import { hasPermission } from "@/lib/permission-policy";
import { localizedAuthPath } from "../../../_lib/auth-routes";
import {
  accessDeniedRouteSlug,
  dashboardMaintenanceRouteSlug,
  localizedPath,
  supportedLocales,
} from "../../../_lib/routes";
import { safeAuthReturnPath } from "../../../_lib/return-paths";
import type { MaintenanceLabels } from "./_components/maintenance-labels";
import { MaintenanceServiceEditor } from "./_components/maintenance-service-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getT("maintenance", { lng: locale });
  return {
    title: t("pages.dashboard.maintenance.title"),
    description: t("pages.dashboard.maintenance.description"),
    robots: { index: false, follow: false },
  };
}

export default async function MaintenanceServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const path = safeAuthReturnPath(
    localizedPath(locale, dashboardMaintenanceRouteSlug),
    locale,
  );
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(localizedAuthPath(locale, "sign-in", path));
  if (
    !hasPermission(currentUser.role, "dashboard:view") ||
    !hasPermission(currentUser.role, "maintenance:view")
  ) {
    redirect(localizedPath(locale, accessDeniedRouteSlug));
  }

  const translationPromise = getT(["common", "maintenance"], { lng: locale });
  let workspace;
  try {
    workspace = await getManagedMaintenanceServices(currentUser.id);
  } catch (error) {
    if (error instanceof MaintenanceError && error.code === "FORBIDDEN") {
      redirect(localizedPath(locale, accessDeniedRouteSlug));
    }
    throw error;
  }

  const { t } = await translationPromise;
  const labels = {
    ...(t("maintenance:pages.dashboard.maintenance", {
      returnObjects: true,
    }) as Omit<MaintenanceLabels, "languages">),
    languages: Object.fromEntries(
      supportedLocales.map((candidate) => [
        candidate,
        t(`common:languages.${candidate}`),
      ]),
    ),
  } as MaintenanceLabels;
  return (
    <main id="main-content" className="dashboard-main dashboard-maintenance-main">
      <header className="dashboard-introduction">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
      </header>
      {!workspace.canManage ? <p className="dashboard-maintenance-readonly">{labels.readOnly}</p> : null}
      <div className="dashboard-maintenance-services">
        {workspace.services.map((service) => (
          <MaintenanceServiceEditor
            key={`${service.code}-${service.updatedAt}`}
            service={service}
            serviceName={labels.serviceNames[service.code]}
            locale={locale}
            labels={labels}
            canManage={workspace.canManage}
          />
        ))}
      </div>
    </main>
  );
}
