"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  normalizeCustomerName,
  validateCustomerName,
  validateEmail,
} from "@/lib/auth-validation";
import { AuthorizationError, requireUser } from "@/lib/authorization";
import {
  changeManagedUserRole,
  createAdministrator,
  revokeManagedUserSessions,
  sendManagedPasswordReset,
  setManagedUserBlocked,
  UserManagementError,
  type ManagedUserAction,
} from "@/lib/user-management";
import {
  dashboardUsersRouteSlug,
  localizedPasswordResetCallbackPath,
  localizedPath,
  supportedLocales,
  type SupportedLocale,
} from "../../_lib/routes";

export type UserActionResult = {
  status: "idle" | "success" | "error" | "warning";
  code?:
    | "BLOCKED"
    | "UNBLOCKED"
    | "SESSIONS_REVOKED"
    | "RESET_SENT"
    | "PROMOTED"
    | "DEMOTED"
    | "ADMINISTRATOR_INVITED"
    | "ADMINISTRATOR_CREATED_DELIVERY_FAILED"
    | "INVALID_INPUT"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "STALE"
    | "RATE_LIMITED"
    | "EMAIL_EXISTS"
    | "DELIVERY_FAILED";
  targetId?: string;
};

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

function isManagedAction(value: string): value is ManagedUserAction {
  return [
    "block",
    "unblock",
    "revoke-sessions",
    "send-password-reset",
    "promote",
    "demote",
  ].includes(value);
}

function errorResult(error: unknown, targetId?: string): UserActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN", targetId };
  }

  if (error instanceof UserManagementError) {
    return { status: "error", code: error.code, targetId };
  }

  return { status: "error", code: "INVALID_INPUT", targetId };
}

function validTargetId(value: string) {
  return value.length > 0 && value.length <= 255;
}

function validTimestamp(value: string) {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

export async function manageUserAction(
  _previous: UserActionResult,
  formData: FormData,
): Promise<UserActionResult> {
  const targetId = stringValue(formData, "targetId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const intent = stringValue(formData, "intent");
  const locale = stringValue(formData, "locale");

  if (
    !validTargetId(targetId) ||
    !isManagedAction(intent) ||
    !isSupportedLocale(locale) ||
    ((intent === "block" ||
      intent === "unblock" ||
      intent === "promote" ||
      intent === "demote") &&
      !validTimestamp(expectedUpdatedAt))
  ) {
    return { status: "error", code: "INVALID_INPUT", targetId };
  }

  try {
    const actor = await requireUser();

    if (intent === "block" || intent === "unblock") {
      await setManagedUserBlocked({
        actorId: actor.id,
        targetId,
        expectedUpdatedAt,
        blocked: intent === "block",
      });
    } else if (intent === "revoke-sessions") {
      await revokeManagedUserSessions({ actorId: actor.id, targetId });
    } else if (intent === "send-password-reset") {
      const usersPath = localizedPath(locale, dashboardUsersRouteSlug);
      await sendManagedPasswordReset({
        actorId: actor.id,
        targetId,
        redirectTo: localizedPasswordResetCallbackPath(locale, usersPath),
        requestHeaders: await headers(),
      });
    } else {
      await changeManagedUserRole({
        actorId: actor.id,
        targetId,
        expectedUpdatedAt,
        nextRole: intent === "promote" ? "administrator" : "customer",
      });
    }

    revalidatePath(localizedPath(locale, dashboardUsersRouteSlug));

    const successCode = {
      block: "BLOCKED",
      unblock: "UNBLOCKED",
      "revoke-sessions": "SESSIONS_REVOKED",
      "send-password-reset": "RESET_SENT",
      promote: "PROMOTED",
      demote: "DEMOTED",
    } as const;

    return {
      status: "success",
      code: successCode[intent],
      targetId,
    };
  } catch (error) {
    return errorResult(error, targetId);
  }
}

export async function inviteAdministratorAction(
  _previous: UserActionResult,
  formData: FormData,
): Promise<UserActionResult> {
  const name = normalizeCustomerName(stringValue(formData, "name"));
  const email = stringValue(formData, "email").trim().toLowerCase();
  const inviteLocale = stringValue(formData, "inviteLocale");
  const dashboardLocale = stringValue(formData, "dashboardLocale");

  if (
    validateCustomerName(name) ||
    validateEmail(email) ||
    !isSupportedLocale(inviteLocale) ||
    !isSupportedLocale(dashboardLocale)
  ) {
    return { status: "error", code: "INVALID_INPUT" };
  }

  try {
    const actor = await requireUser();
    const requestHeaders = await headers();
    const created = await createAdministrator({
      actorId: actor.id,
      name,
      email,
      requestHeaders,
    });
    const usersPath = localizedPath(inviteLocale, dashboardUsersRouteSlug);

    try {
      await sendManagedPasswordReset({
        actorId: actor.id,
        targetId: created.id,
        redirectTo: localizedPasswordResetCallbackPath(inviteLocale, usersPath),
        requestHeaders,
      });
    } catch (error) {
      revalidatePath(localizedPath(dashboardLocale, dashboardUsersRouteSlug));

      if (
        error instanceof UserManagementError &&
        error.code === "DELIVERY_FAILED"
      ) {
        return {
          status: "warning",
          code: "ADMINISTRATOR_CREATED_DELIVERY_FAILED",
          targetId: created.id,
        };
      }

      throw error;
    }

    revalidatePath(localizedPath(dashboardLocale, dashboardUsersRouteSlug));
    return {
      status: "success",
      code: "ADMINISTRATOR_INVITED",
      targetId: created.id,
    };
  } catch (error) {
    return errorResult(error);
  }
}
