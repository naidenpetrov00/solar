import { getT } from "@/i18n.server";
import {
  dashboardCatalogRouteSlug,
  dashboardPromotionsRouteSlug,
  dashboardRouteSlug,
  dashboardUsersRouteSlug,
  localizedPath,
} from "../_lib/routes";
import { DashboardNavigation } from "./_components/dashboard-navigation";
import { getCurrentUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permission-policy";

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const [{ t }, currentUser] = await Promise.all([
    getT(["common", "dashboard"], { lng: locale }),
    getCurrentUser(),
  ]);
  const items = [
    {
      href: localizedPath(locale, dashboardRouteSlug),
      label: t("dashboard:pages.dashboard.navigation.overview"),
    },
    ...(currentUser && hasPermission(currentUser.role, "catalog:view")
      ? [
          {
            href: localizedPath(locale, dashboardCatalogRouteSlug),
            label: t("dashboard:pages.dashboard.navigation.catalog"),
          },
          {
            href: localizedPath(locale, dashboardPromotionsRouteSlug),
            label: t("dashboard:pages.dashboard.navigation.promotions"),
          },
        ]
      : []),
    ...(currentUser && hasPermission(currentUser.role, "customer:view")
      ? [
          {
            href: localizedPath(locale, dashboardUsersRouteSlug),
            label: t("dashboard:pages.dashboard.navigation.users"),
          },
        ]
      : []),
  ];

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-rail">
        <p className="dashboard-rail-title">
          {t("dashboard:pages.dashboard.title")}
        </p>
        <DashboardNavigation
          ariaLabel={t("accessibility.dashboardNavigation")}
          items={items}
        />
      </aside>
      {children}
    </div>
  );
}
