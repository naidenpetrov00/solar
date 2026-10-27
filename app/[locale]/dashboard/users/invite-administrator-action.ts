"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  normalizeCustomerName,
  validateCustomerName,
  validateEmail,
} from "@/lib/auth-validation";
import { requireUser } from "@/lib/authorization";
import { createAdministrator } from "@/lib/user-management-admin";
import { UserManagementError } from "@/lib/user-management-model";
import { sendManagedPasswordReset } from "@/lib/user-management-recovery";
import { dashboardUsersRouteSlug, localizedPath } from "../../_lib/routes";
import { localizedPasswordResetCallbackPath } from "../../_lib/auth-routes";
import {
  errorResult,
  isSupportedLocale,
  stringValue,
  type UserActionResult,
} from "./user-action-model";
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
