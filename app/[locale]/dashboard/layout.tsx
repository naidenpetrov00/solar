import { getT } from "@/i18n.server";
import {
  dashboardRouteSlug,
  dashboardUsersRouteSlug,
  localizedPath,
} from "../_lib/routes";
import { DashboardNavigation } from "./_components/dashboard-navigation";

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-rail">
        <p className="dashboard-rail-title">{t("pages.dashboard.title")}</p>
        <DashboardNavigation
          ariaLabel={t("accessibility.dashboardNavigation")}
          items={[
            {
              href: localizedPath(locale, dashboardRouteSlug),
              label: t("pages.dashboard.navigation.overview"),
            },
            {
              href: localizedPath(locale, dashboardUsersRouteSlug),
              label: t("pages.dashboard.navigation.users"),
            },
          ]}
        />
      </aside>
      {children}
    </div>
  );
}
