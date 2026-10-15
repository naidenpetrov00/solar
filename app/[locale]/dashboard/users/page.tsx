import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getT } from "@/i18n.server";
import { getCurrentUser, hasPermission } from "@/lib/authorization";
import {
  listManagedUsers,
  UserManagementError,
  type ManagedUsersPage,
} from "@/lib/user-management";
import { getPrivatePageMetadata } from "../../_lib/metadata";
import {
  accessDeniedRouteSlug,
  dashboardUsersRouteSlug,
  localizedAuthPath,
  localizedPath,
  safeAuthReturnPath,
  supportedLocales,
} from "../../_lib/routes";
import { UsersWorkspace, type UsersWorkspaceLabels } from "./_components/users-workspace";

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
  const [{ locale }, queryParameters] = await Promise.all([params, searchParams]);
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

  const translationPromise = getT("common", { lng: locale });
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
  const labels: UsersWorkspaceLabels = {
    selectUser: t("pages.dashboard.users.list.selectUser"),
    noSelectionTitle: t("pages.dashboard.users.detail.noSelectionTitle"),
    noSelectionDescription: t("pages.dashboard.users.detail.noSelectionDescription"),
    backToUsers: t("pages.dashboard.users.detail.backToUsers"),
    details: t("pages.dashboard.users.detail.title"),
    name: t("pages.dashboard.users.fields.name"),
    email: t("pages.dashboard.users.fields.email"),
    role: t("pages.dashboard.users.fields.role"),
    verification: t("pages.dashboard.users.fields.verification"),
    status: t("pages.dashboard.users.fields.status"),
    createdAt: t("pages.dashboard.users.fields.createdAt"),
    updatedAt: t("pages.dashboard.users.fields.updatedAt"),
    roles: {
      customer: t("pages.dashboard.users.roles.customer"),
      administrator: t("pages.dashboard.users.roles.administrator"),
    },
    verificationStates: {
      verified: t("pages.dashboard.users.verification.verified"),
      unverified: t("pages.dashboard.users.verification.unverified"),
    },
    accountStates: {
      active: t("pages.dashboard.users.status.active"),
      blocked: t("pages.dashboard.users.status.blocked"),
    },
    actionsTitle: t("pages.dashboard.users.actions.title"),
    actions: {
      block: t("pages.dashboard.users.actions.block"),
      unblock: t("pages.dashboard.users.actions.unblock"),
      "revoke-sessions": t("pages.dashboard.users.actions.revokeSessions"),
      "send-password-reset": t("pages.dashboard.users.actions.sendPasswordReset"),
      promote: t("pages.dashboard.users.actions.promote"),
      demote: t("pages.dashboard.users.actions.demote"),
    },
    confirmations: {
      block: {
        title: t("pages.dashboard.users.confirmations.block.title"),
        description: t("pages.dashboard.users.confirmations.block.description"),
        confirm: t("pages.dashboard.users.confirmations.block.confirm"),
      },
      unblock: {
        title: t("pages.dashboard.users.confirmations.unblock.title"),
        description: t("pages.dashboard.users.confirmations.unblock.description"),
        confirm: t("pages.dashboard.users.confirmations.unblock.confirm"),
      },
      "revoke-sessions": {
        title: t("pages.dashboard.users.confirmations.revokeSessions.title"),
        description: t("pages.dashboard.users.confirmations.revokeSessions.description"),
        confirm: t("pages.dashboard.users.confirmations.revokeSessions.confirm"),
      },
      "send-password-reset": {
        title: t("pages.dashboard.users.confirmations.sendPasswordReset.title"),
        description: t("pages.dashboard.users.confirmations.sendPasswordReset.description"),
        confirm: t("pages.dashboard.users.confirmations.sendPasswordReset.confirm"),
      },
      promote: {
        title: t("pages.dashboard.users.confirmations.promote.title"),
        description: t("pages.dashboard.users.confirmations.promote.description"),
        confirm: t("pages.dashboard.users.confirmations.promote.confirm"),
      },
      demote: {
        title: t("pages.dashboard.users.confirmations.demote.title"),
        description: t("pages.dashboard.users.confirmations.demote.description"),
        confirm: t("pages.dashboard.users.confirmations.demote.confirm"),
      },
    },
    cancel: t("pages.dashboard.users.confirmations.cancel"),
    working: t("pages.dashboard.users.actions.working"),
    invite: {
      open: t("pages.dashboard.users.invite.open"),
      title: t("pages.dashboard.users.invite.title"),
      description: t("pages.dashboard.users.invite.description"),
      name: t("pages.dashboard.users.invite.name"),
      email: t("pages.dashboard.users.invite.email"),
      language: t("pages.dashboard.users.invite.language"),
      submit: t("pages.dashboard.users.invite.submit"),
      submitting: t("pages.dashboard.users.invite.submitting"),
    },
    localeNames: Object.fromEntries(
      supportedLocales.map((candidate) => [candidate, t(`languages.${candidate}`)]),
    ),
    results: {
      BLOCKED: t("pages.dashboard.users.results.blocked"),
      UNBLOCKED: t("pages.dashboard.users.results.unblocked"),
      SESSIONS_REVOKED: t("pages.dashboard.users.results.sessionsRevoked"),
      RESET_SENT: t("pages.dashboard.users.results.resetSent"),
      PROMOTED: t("pages.dashboard.users.results.promoted"),
      DEMOTED: t("pages.dashboard.users.results.demoted"),
      ADMINISTRATOR_INVITED: t("pages.dashboard.users.results.administratorInvited"),
      ADMINISTRATOR_CREATED_DELIVERY_FAILED: t("pages.dashboard.users.results.administratorCreatedDeliveryFailed"),
      INVALID_INPUT: t("pages.dashboard.users.results.invalidInput"),
      FORBIDDEN: t("pages.dashboard.users.results.forbidden"),
      NOT_FOUND: t("pages.dashboard.users.results.notFound"),
      STALE: t("pages.dashboard.users.results.stale"),
      RATE_LIMITED: t("pages.dashboard.users.results.rateLimited"),
      EMAIL_EXISTS: t("pages.dashboard.users.results.emailExists"),
      DELIVERY_FAILED: t("pages.dashboard.users.results.deliveryFailed"),
    },
  };

  return (
    <main id="main-content" className="dashboard-main dashboard-users-main">
      <header className="dashboard-introduction dashboard-users-introduction">
        <div>
          <h1>{t("pages.dashboard.users.title")}</h1>
          <p>{t("pages.dashboard.users.description")}</p>
        </div>
      </header>

      <section className="dashboard-users-toolbar" aria-label={t("pages.dashboard.users.search.regionLabel")}>
        <form className="dashboard-users-search" method="get">
          <label htmlFor="dashboard-user-search">
            {t("pages.dashboard.users.search.label")}
          </label>
          <div>
            <input
              id="dashboard-user-search"
              name="q"
              type="search"
              defaultValue={result.query}
              maxLength={100}
              placeholder={t("pages.dashboard.users.search.placeholder")}
            />
            <button type="submit">{t("pages.dashboard.users.search.submit")}</button>
            {result.query ? (
              <Link href={usersPath}>{t("pages.dashboard.users.search.clear")}</Link>
            ) : null}
          </div>
        </form>
        <p className="dashboard-users-count">
          {t("pages.dashboard.users.list.count", { count: result.total })}
        </p>
      </section>

      {result.users.length === 0 ? (
        <section className="dashboard-users-empty" aria-labelledby="users-empty-title">
          <h2 id="users-empty-title">
            {result.query
              ? t("pages.dashboard.users.empty.searchTitle")
              : t("pages.dashboard.users.empty.title")}
          </h2>
          <p>
            {result.query
              ? t("pages.dashboard.users.empty.searchDescription")
              : t("pages.dashboard.users.empty.description")}
          </p>
          {result.query ? (
            <Link href={usersPath}>{t("pages.dashboard.users.search.clear")}</Link>
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
        <nav className="dashboard-users-pagination" aria-label={t("pages.dashboard.users.pagination.label")}>
          {result.page > 1 ? (
            <Link href={pageHref(locale, result.query, result.page - 1)}>
              {t("pages.dashboard.users.pagination.previous")}
            </Link>
          ) : <span />}
          <span>
            {t("pages.dashboard.users.pagination.status", {
              page: result.page,
              pages: result.pageCount,
            })}
          </span>
          {result.page < result.pageCount ? (
            <Link href={pageHref(locale, result.query, result.page + 1)}>
              {t("pages.dashboard.users.pagination.next")}
            </Link>
          ) : <span />}
        </nav>
      ) : null}
    </main>
  );
}
