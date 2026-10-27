import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, ButtonLink } from "@/components/button";

import { getT } from "@/i18n.server";
import { getCurrentUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permission-policy";
import { listManagedUsers } from "@/lib/user-management-list";
import {
  UserManagementError,
  type ManagedUsersPage,
} from "@/lib/user-management-model";
import { getPrivatePageMetadata } from "../../_lib/metadata";
import {
  accessDeniedRouteSlug,
  dashboardUsersRouteSlug,
  localizedPath,
} from "../../_lib/routes";
import { localizedAuthPath } from "../../_lib/auth-routes";
import { safeAuthReturnPath } from "../../_lib/return-paths";
import { UsersWorkspace } from "./_components/users-workspace";
import { getUsersWorkspaceLabels } from "./users-labels";

type UsersSearchParams = {
  q?: string | string[];
  page?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPrivatePageMetadata(
    locale,
    dashboardUsersRouteSlug,
    "dashboard.users",
  );
}

function pageHref(locale: string, query: string, page: number) {
  const parameters = new URLSearchParams();

  if (query) parameters.set("q", query);
  if (page > 1) parameters.set("page", String(page));

  const suffix = parameters.toString();
  const path = localizedPath(locale, dashboardUsersRouteSlug);
  return suffix ? `${path}?${suffix}` : path;
}

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<UsersSearchParams>;
}) {
  const [{ locale }, queryParameters] = await Promise.all([
    params,
    searchParams,
  ]);
  const usersPath = safeAuthReturnPath(
    localizedPath(locale, dashboardUsersRouteSlug),
    locale,
  );
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(localizedAuthPath(locale, "sign-in", usersPath));
  }

  if (
    !hasPermission(currentUser.role, "dashboard:view") ||
    !hasPermission(currentUser.role, "customer:view")
  ) {
    redirect(localizedPath(locale, accessDeniedRouteSlug));
  }

  const translationPromise = getT(["common", "dashboard", "users"], {
    lng: locale,
  });
  let result: ManagedUsersPage;

  try {
    result = await listManagedUsers(
      currentUser.id,
      queryParameters.q,
      queryParameters.page,
    );
  } catch (error) {
    if (error instanceof UserManagementError && error.code === "FORBIDDEN") {
      redirect(localizedPath(locale, accessDeniedRouteSlug));
    }

    throw error;
  }

  const { t } = await translationPromise;
  const labels = getUsersWorkspaceLabels(t);

  return (
    <main id="main-content" className="dashboard-main dashboard-users-main">
      <header className="dashboard-introduction dashboard-users-introduction">
        <div>
          <h1>{t("users:pages.dashboard.users.title")}</h1>
          <p>{t("users:pages.dashboard.users.description")}</p>
        </div>
      </header>

      <section
        className="dashboard-users-toolbar"
        aria-label={t("users:pages.dashboard.users.search.regionLabel")}
      >
        <form className="dashboard-users-search" method="get">
          <label htmlFor="dashboard-user-search">
            {t("users:pages.dashboard.users.search.label")}
          </label>
          <div>
            <input
              id="dashboard-user-search"
              name="q"
              type="search"
              defaultValue={result.query}
              maxLength={100}
              placeholder={t("users:pages.dashboard.users.search.placeholder")}
            />
            <Button type="submit">
              {t("users:pages.dashboard.users.search.submit")}
            </Button>
            {result.query ? (
              <ButtonLink variant="informational" href={usersPath}>
                {t("users:pages.dashboard.users.search.clear")}
              </ButtonLink>
            ) : null}
          </div>
        </form>
        <p className="dashboard-users-count">
          {t("users:pages.dashboard.users.list.count", { count: result.total })}
        </p>
      </section>

      {result.users.length === 0 ? (
        <section
          className="dashboard-users-empty"
          aria-labelledby="users-empty-title"
        >
          <h2 id="users-empty-title">
            {result.query
              ? t("users:pages.dashboard.users.empty.searchTitle")
              : t("users:pages.dashboard.users.empty.title")}
          </h2>
          <p>
            {result.query
              ? t("users:pages.dashboard.users.empty.searchDescription")
              : t("users:pages.dashboard.users.empty.description")}
          </p>
          {result.query ? (
            <ButtonLink variant="informational" href={usersPath}>
              {t("users:pages.dashboard.users.search.clear")}
            </ButtonLink>
          ) : null}
        </section>
      ) : (
        <UsersWorkspace
          users={result.users}
          locale={locale}
          canInvite={currentUser.role === "admin"}
          labels={labels}
        />
      )}

      {result.pageCount > 1 ? (
        <nav
          className="dashboard-users-pagination"
          aria-label={t("users:pages.dashboard.users.pagination.label")}
        >
          {result.page > 1 ? (
            <ButtonLink
              variant="secondary"
              href={pageHref(locale, result.query, result.page - 1)}
            >
              {t("users:pages.dashboard.users.pagination.previous")}
            </ButtonLink>
          ) : (
            <span />
          )}
          <span>
            {t("users:pages.dashboard.users.pagination.status", {
              page: result.page,
              pages: result.pageCount,
            })}
          </span>
          {result.page < result.pageCount ? (
            <ButtonLink
              variant="secondary"
              href={pageHref(locale, result.query, result.page + 1)}
            >
              {t("users:pages.dashboard.users.pagination.next")}
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
