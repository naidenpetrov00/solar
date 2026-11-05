"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/authorization";
import {
  changeManagedUserRole,
  revokeManagedUserSessions,
  setManagedUserBlocked,
} from "@/lib/user-management-account";
import { setManagedUserOrderEmailPreference } from "@/lib/user-management-order-emails";
import { sendManagedPasswordReset } from "@/lib/user-management-recovery";
import { dashboardUsersRouteSlug, localizedPath } from "../../_lib/routes";
import { localizedPasswordResetCallbackPath } from "../../_lib/auth-routes";
import {
  errorResult,
  isManagedAction,
  isSupportedLocale,
  stringValue,
  validTargetId,
  validTimestamp,
  type UserActionResult,
} from "./user-action-model";

export async function manageUserOrderEmailPreferenceAction(
  _previous: UserActionResult,
  formData: FormData,
): Promise<UserActionResult> {
  const targetId = stringValue(formData, "targetId");
  const expectedVersionValue = stringValue(formData, "expectedVersion");
  const enabledValue = stringValue(formData, "enabled");
  const locale = stringValue(formData, "locale");
  const expectedVersion = Number(expectedVersionValue);

  if (
    !validTargetId(targetId) ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    (enabledValue !== "true" && enabledValue !== "false") ||
    !isSupportedLocale(locale)
  ) {
    return { status: "error", code: "INVALID_INPUT", targetId };
  }

  try {
    const actor = await requireUser();
    const result = await setManagedUserOrderEmailPreference({
      actorId: actor.id,
      targetId,
      expectedVersion,
      enabled: enabledValue === "true",
    });

    revalidatePath(localizedPath(locale, dashboardUsersRouteSlug));
    return {
      status: "success",
      code: "ORDER_EMAIL_PREFERENCE_SAVED",
      targetId,
      mutationVersion: result.mutationVersion,
    };
  } catch (error) {
    return errorResult(error, targetId);
  }
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
