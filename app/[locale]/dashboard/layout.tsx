import { getT } from "@/i18n.server";
import {
  dashboardCatalogRouteSlug,
  dashboardRouteSlug,
  dashboardUsersRouteSlug,
  localizedPath,
} from "../_lib/routes";
import { DashboardNavigation } from "./_components/dashboard-navigation";
import { getCurrentUser, hasPermission } from "@/lib/authorization";

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const [{ t }, currentUser] = await Promise.all([
    getT("common", { lng: locale }),
    getCurrentUser(),
  ]);
  const items = [
    {
      href: localizedPath(locale, dashboardRouteSlug),
      label: t("pages.dashboard.navigation.overview"),
    },
    ...(currentUser && hasPermission(currentUser.role, "catalog:view")
      ? [
          {
            href: localizedPath(locale, dashboardCatalogRouteSlug),
            label: t("pages.dashboard.navigation.catalog"),
          },
        ]
      : []),
    ...(currentUser && hasPermission(currentUser.role, "customer:view")
      ? [
          {
            href: localizedPath(locale, dashboardUsersRouteSlug),
            label: t("pages.dashboard.navigation.users"),
          },
        ]
      : []),
  ];

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-rail">
        <p className="dashboard-rail-title">{t("pages.dashboard.title")}</p>
        <DashboardNavigation
          ariaLabel={t("accessibility.dashboardNavigation")}
          items={items}
        />
      </aside>
      {children}
    </div>
  );
}
