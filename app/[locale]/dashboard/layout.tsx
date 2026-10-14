import type { Metadata } from "next";
import Link from "next/link";
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

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
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
    <div className="dashboard-shell">
      <aside className="dashboard-rail">
        <p className="dashboard-rail-title">{t("pages.dashboard.title")}</p>
        <nav aria-label={t("accessibility.dashboardNavigation")}>
          <Link
            className="dashboard-rail-link"
            href={dashboardPath}
            aria-current="page"
          >
            {t("pages.dashboard.navigation.overview")}
          </Link>
        </nav>
      </aside>
      {children}
    </div>
  );
}
