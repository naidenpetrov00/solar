import type { getT } from "@/i18n.server";
import { supportedLocales } from "../../_lib/routes";
import type { UsersWorkspaceLabels } from "./_components/users-feedback";

export function getUsersWorkspaceLabels(
  t: Awaited<ReturnType<typeof getT>>["t"],
): UsersWorkspaceLabels {
  return {
    selectUser: t("users:pages.dashboard.users.list.selectUser"),
    noSelectionTitle: t("users:pages.dashboard.users.detail.noSelectionTitle"),
    noSelectionDescription: t(
      "users:pages.dashboard.users.detail.noSelectionDescription",
    ),
    backToUsers: t("users:pages.dashboard.users.detail.backToUsers"),
    details: t("users:pages.dashboard.users.detail.title"),
    name: t("users:pages.dashboard.users.fields.name"),
    email: t("users:pages.dashboard.users.fields.email"),
    role: t("users:pages.dashboard.users.fields.role"),
    verification: t("users:pages.dashboard.users.fields.verification"),
    status: t("users:pages.dashboard.users.fields.status"),
    createdAt: t("users:pages.dashboard.users.fields.createdAt"),
    updatedAt: t("users:pages.dashboard.users.fields.updatedAt"),
    roles: {
      customer: t("users:pages.dashboard.users.roles.customer"),
      administrator: t("users:pages.dashboard.users.roles.administrator"),
    },
    verificationStates: {
      verified: t("users:pages.dashboard.users.verification.verified"),
      unverified: t("users:pages.dashboard.users.verification.unverified"),
    },
    accountStates: {
      active: t("users:pages.dashboard.users.status.active"),
      blocked: t("users:pages.dashboard.users.status.blocked"),
    },
    actionsTitle: t("users:pages.dashboard.users.actions.title"),
    actions: {
      block: t("users:pages.dashboard.users.actions.block"),
      unblock: t("users:pages.dashboard.users.actions.unblock"),
      "revoke-sessions": t(
        "users:pages.dashboard.users.actions.revokeSessions",
      ),
      "send-password-reset": t(
        "users:pages.dashboard.users.actions.sendPasswordReset",
      ),
      promote: t("users:pages.dashboard.users.actions.promote"),
      demote: t("users:pages.dashboard.users.actions.demote"),
    },
    confirmations: {
      block: {
        title: t("users:pages.dashboard.users.confirmations.block.title"),
        description: t(
          "users:pages.dashboard.users.confirmations.block.description",
        ),
        confirm: t("users:pages.dashboard.users.confirmations.block.confirm"),
      },
      unblock: {
        title: t("users:pages.dashboard.users.confirmations.unblock.title"),
        description: t(
          "users:pages.dashboard.users.confirmations.unblock.description",
        ),
        confirm: t("users:pages.dashboard.users.confirmations.unblock.confirm"),
      },
      "revoke-sessions": {
        title: t(
          "users:pages.dashboard.users.confirmations.revokeSessions.title",
        ),
        description: t(
          "users:pages.dashboard.users.confirmations.revokeSessions.description",
        ),
        confirm: t(
          "users:pages.dashboard.users.confirmations.revokeSessions.confirm",
        ),
      },
      "send-password-reset": {
        title: t(
          "users:pages.dashboard.users.confirmations.sendPasswordReset.title",
        ),
        description: t(
          "users:pages.dashboard.users.confirmations.sendPasswordReset.description",
        ),
        confirm: t(
          "users:pages.dashboard.users.confirmations.sendPasswordReset.confirm",
        ),
      },
      promote: {
        title: t("users:pages.dashboard.users.confirmations.promote.title"),
        description: t(
          "users:pages.dashboard.users.confirmations.promote.description",
        ),
        confirm: t("users:pages.dashboard.users.confirmations.promote.confirm"),
      },
      demote: {
        title: t("users:pages.dashboard.users.confirmations.demote.title"),
        description: t(
          "users:pages.dashboard.users.confirmations.demote.description",
        ),
        confirm: t("users:pages.dashboard.users.confirmations.demote.confirm"),
      },
    },
    cancel: t("users:pages.dashboard.users.confirmations.cancel"),
    working: t("users:pages.dashboard.users.actions.working"),
    invite: {
      open: t("users:pages.dashboard.users.invite.open"),
      title: t("users:pages.dashboard.users.invite.title"),
      description: t("users:pages.dashboard.users.invite.description"),
      name: t("users:pages.dashboard.users.invite.name"),
      email: t("users:pages.dashboard.users.invite.email"),
      language: t("users:pages.dashboard.users.invite.language"),
      submit: t("users:pages.dashboard.users.invite.submit"),
      submitting: t("users:pages.dashboard.users.invite.submitting"),
    },
    localeNames: Object.fromEntries(
      supportedLocales.map((candidate) => [
        candidate,
        t(`languages.${candidate}`),
      ]),
    ),
    results: {
      BLOCKED: t("users:pages.dashboard.users.results.blocked"),
      UNBLOCKED: t("users:pages.dashboard.users.results.unblocked"),
      SESSIONS_REVOKED: t(
        "users:pages.dashboard.users.results.sessionsRevoked",
      ),
      RESET_SENT: t("users:pages.dashboard.users.results.resetSent"),
      PROMOTED: t("users:pages.dashboard.users.results.promoted"),
      DEMOTED: t("users:pages.dashboard.users.results.demoted"),
      ADMINISTRATOR_INVITED: t(
        "users:pages.dashboard.users.results.administratorInvited",
      ),
      ADMINISTRATOR_CREATED_DELIVERY_FAILED: t(
        "users:pages.dashboard.users.results.administratorCreatedDeliveryFailed",
      ),
      INVALID_INPUT: t("users:pages.dashboard.users.results.invalidInput"),
      FORBIDDEN: t("users:pages.dashboard.users.results.forbidden"),
      NOT_FOUND: t("users:pages.dashboard.users.results.notFound"),
      STALE: t("users:pages.dashboard.users.results.stale"),
      RATE_LIMITED: t("users:pages.dashboard.users.results.rateLimited"),
      EMAIL_EXISTS: t("users:pages.dashboard.users.results.emailExists"),
      DELIVERY_FAILED: t("users:pages.dashboard.users.results.deliveryFailed"),
    },
  } satisfies UsersWorkspaceLabels;
}
