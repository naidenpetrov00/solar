import { AuthorizationError } from "@/lib/permission-policy";
import {
  UserManagementError,
  type ManagedUserAction,
} from "@/lib/user-management-model";
import { supportedLocales, type SupportedLocale } from "../../_lib/routes";
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

export function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

export function isManagedAction(value: string): value is ManagedUserAction {
  return [
    "block",
    "unblock",
    "revoke-sessions",
    "send-password-reset",
    "promote",
    "demote",
  ].includes(value);
}

export function errorResult(
  error: unknown,
  targetId?: string,
): UserActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN", targetId };
  }

  if (error instanceof UserManagementError) {
    return { status: "error", code: error.code, targetId };
  }

  return { status: "error", code: "INVALID_INPUT", targetId };
}

export function validTargetId(value: string) {
  return value.length > 0 && value.length <= 255;
}

export function validTimestamp(value: string) {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}
