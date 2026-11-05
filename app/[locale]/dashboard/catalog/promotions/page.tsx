import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permission-policy";
import { isUuid } from "@/lib/catalog/model";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { getManagedPromotionWorkspace } from "@/lib/catalog/management-promotion-read";
import {
  accessDeniedRouteSlug,
  dashboardPromotionsRouteSlug,
  localizedPath,
  supportedLocales,
} from "../../../_lib/routes";
import { localizedAuthPath } from "../../../_lib/auth-routes";
import { safeAuthReturnPath } from "../../../_lib/return-paths";
import { PromotionWorkspace } from "./_components/promotion-workspace";
import type { PromotionLabels } from "./_components/promotion-labels";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ promotion?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getT("promotions", { lng: locale });
  return {
    title: t("pages.dashboard.promotions.title"),
    description: t("pages.dashboard.promotions.description"),
    robots: { index: false, follow: false },
  };
}

export default async function PromotionsPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const path = safeAuthReturnPath(
    localizedPath(locale, dashboardPromotionsRouteSlug),
    locale,
  );
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(localizedAuthPath(locale, "sign-in", path));
  if (!hasPermission(currentUser.role, "dashboard:view") || !hasPermission(currentUser.role, "catalog:view")) {
    redirect(localizedPath(locale, accessDeniedRouteSlug));
  }
  const parameter = Array.isArray(query.promotion)
    ? query.promotion[0]
    : query.promotion;
  const creating = parameter === "new";
  const selectedId = parameter && isUuid(parameter) ? parameter : undefined;
  const translationPromise = getT(["common", "promotions"], { lng: locale });
  let workspace;
  try {
    workspace = await getManagedPromotionWorkspace(
      currentUser.id,
      locale,
      selectedId,
    );
  } catch (error) {
    if (error instanceof CatalogManagementError && error.code === "FORBIDDEN") {
      redirect(localizedPath(locale, accessDeniedRouteSlug));
    }
    if (error instanceof CatalogManagementError && error.code === "NOT_FOUND") {
      redirect(path);
    }
    throw error;
  }
  const { t } = await translationPromise;
  const labels = {
    ...(t("promotions:pages.dashboard.promotions", { returnObjects: true }) as object),
    languages: Object.fromEntries(
      supportedLocales.map((candidate) => [candidate, t(`languages.${candidate}`)]),
    ),
  } as PromotionLabels;
  return (
    <main id="main-content" className="dashboard-main dashboard-promotions-main">
      <header className="dashboard-introduction">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
      </header>
      <PromotionWorkspace
        workspace={workspace}
        locale={locale}
        path={path}
        labels={labels}
        creating={creating}
      />
    </main>
  );
}
