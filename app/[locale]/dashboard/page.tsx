import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser, hasPermission } from "@/lib/authorization";
import { getPrivatePageMetadata } from "../_lib/metadata";
import {
  accessDeniedRouteSlug,
  dashboardRouteSlug,
  localizedAuthPath,
  localizedPath,
  safeAuthReturnPath,
} from "../_lib/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPrivatePageMetadata(locale, dashboardRouteSlug, "dashboard");
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dashboardPath = safeAuthReturnPath(
    localizedPath(locale, dashboardRouteSlug),
    locale,
  );
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(localizedAuthPath(locale, "sign-in", dashboardPath));
  }

  if (!hasPermission(currentUser.role, "dashboard:view")) {
    redirect(localizedPath(locale, accessDeniedRouteSlug));
  }

  const { t } = await getT("common", { lng: locale });

  return (
    <main id="main-content" className="dashboard-main">
      <header className="dashboard-introduction">
        <h1>{t("pages.dashboard.title")}</h1>
        <p>{t("pages.dashboard.description")}</p>
      </header>
      <section
        className="dashboard-overview"
        aria-labelledby="dashboard-overview-title"
      >
        <h2 id="dashboard-overview-title">
          {t("pages.dashboard.overview.title")}
        </h2>
        <p>{t("pages.dashboard.overview.description")}</p>
      </section>
    </main>
  );
}
