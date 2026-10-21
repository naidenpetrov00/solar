import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser, hasPermission } from "@/lib/authorization";
import {
  CatalogManagementError,
  getManagedCatalogCategoryWorkspace,
  getManagedCatalogProductWorkspace,
} from "@/lib/catalog/management";
import { isUuid } from "@/lib/catalog/model";
import { getPrivatePageMetadata } from "../../_lib/metadata";
import {
  accessDeniedRouteSlug,
  dashboardCatalogRouteSlug,
  localizedAuthPath,
  localizedPath,
  safeAuthReturnPath,
  supportedLocales,
} from "../../_lib/routes";
import {
  CatalogWorkspace,
  type CatalogLabels,
} from "./_components/catalog-workspace";

type CatalogSearchParams = {
  category?: string | string[];
  view?: string | string[];
  product?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPrivatePageMetadata(
    locale,
    dashboardCatalogRouteSlug,
    "dashboard.catalog",
  );
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const catalogPath = safeAuthReturnPath(
    localizedPath(locale, dashboardCatalogRouteSlug),
    locale,
  );
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(localizedAuthPath(locale, "sign-in", catalogPath));
  }

  if (
    !hasPermission(currentUser.role, "dashboard:view") ||
    !hasPermission(currentUser.role, "catalog:view")
  ) {
    redirect(localizedPath(locale, accessDeniedRouteSlug));
  }

  const selectedCategoryId = Array.isArray(query.category)
    ? query.category[0]
    : query.category;
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view = requestedView === "products" ? "products" : "category";
  const productParameter = Array.isArray(query.product)
    ? query.product[0]
    : query.product;
  const requestedProduct =
    productParameter === "new" || (productParameter && isUuid(productParameter))
      ? productParameter
      : null;
  const translationPromise = getT("common", { lng: locale });
  let workspace;

  try {
    workspace = await getManagedCatalogCategoryWorkspace(
      currentUser.id,
      locale,
      selectedCategoryId,
    );
  } catch (error) {
    if (
      error instanceof CatalogManagementError &&
      error.code === "FORBIDDEN"
    ) {
      redirect(localizedPath(locale, accessDeniedRouteSlug));
    }

    throw error;
  }

  let productWorkspace = null;
  if (view === "products" && workspace.selected) {
    try {
      productWorkspace = await getManagedCatalogProductWorkspace(
        currentUser.id,
        locale,
        workspace.selected.id,
        requestedProduct && requestedProduct !== "new"
          ? requestedProduct
          : undefined,
      );
    } catch (error) {
      if (
        error instanceof CatalogManagementError &&
        error.code === "NOT_FOUND"
      ) {
        redirect(
          `${catalogPath}?category=${workspace.selected.id}&view=products`,
        );
      }
      if (
        error instanceof CatalogManagementError &&
        error.code === "FORBIDDEN"
      ) {
        redirect(localizedPath(locale, accessDeniedRouteSlug));
      }
      throw error;
    }
  }

  const { t } = await translationPromise;
  const translatedLabels = t("pages.dashboard.catalog", {
    returnObjects: true,
  }) as Omit<CatalogLabels, "languages">;
  const labels: CatalogLabels = {
    ...translatedLabels,
    languages: Object.fromEntries(
      supportedLocales.map((candidate) => [
        candidate,
        t(`languages.${candidate}`),
      ]),
    ) as CatalogLabels["languages"],
  };

  return (
    <main id="main-content" className="dashboard-main dashboard-catalog-main">
      <header className="dashboard-introduction dashboard-catalog-introduction">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
      </header>
      <CatalogWorkspace
        locale={locale}
        catalogPath={catalogPath}
        categories={workspace.categories}
        selected={workspace.selected}
        canManage={workspace.canManage}
        labels={labels}
        openSelectedOnMobile={Boolean(selectedCategoryId)}
        view={view}
        requestedProduct={requestedProduct}
        productWorkspace={productWorkspace}
      />
    </main>
  );
}
