import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  appRoles,
  type AppRole,
} from "@/lib/auth-roles";

export type CurrentUser = typeof auth.$Infer.Session.user;

export type AuthorizationErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "PERMISSION_DENIED";

export const appPermissions = [
  "dashboard:view",
  "customer:create",
  "customer:view",
  "customer:update",
  "customer:block",
  "customer:delete",
  "customer:change-role",
  "customer:sessions:list",
  "customer:sessions:revoke",
  "administrator:create",
  "administrator:view",
  "administrator:update",
  "administrator:block",
  "administrator:delete",
  "administrator:change-role",
  "administrator:sessions:list",
  "administrator:sessions:revoke",
] as const;

export type AppPermission = (typeof appPermissions)[number];
export type ManageableRole = Exclude<AppRole, "admin">;
export type UserManagementAction =
  | "view"
  | "update"
  | "block"
  | "delete"
  | "change-role"
  | "sessions:list"
  | "sessions:revoke";

const permissionsByRole = {
  customer: [] as const,
  administrator: [
    "dashboard:view",
    "customer:create",
    "customer:view",
    "customer:update",
    "customer:block",
    "customer:delete",
    "customer:sessions:list",
    "customer:sessions:revoke",
  ] as const,
  admin: appPermissions,
} satisfies Record<AppRole, readonly AppPermission[]>;

const targetPermission = {
  customer: {
    view: "customer:view",
    update: "customer:update",
    block: "customer:block",
    delete: "customer:delete",
    "change-role": "customer:change-role",
    "sessions:list": "customer:sessions:list",
    "sessions:revoke": "customer:sessions:revoke",
  },
  administrator: {
    view: "administrator:view",
    update: "administrator:update",
    block: "administrator:block",
    delete: "administrator:delete",
    "change-role": "administrator:change-role",
    "sessions:list": "administrator:sessions:list",
    "sessions:revoke": "administrator:sessions:revoke",
  },
} satisfies Record<
  ManageableRole,
  Record<UserManagementAction, AppPermission>
>;

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;
  readonly status: 401 | 403;

  constructor(code: AuthorizationErrorCode, status: 401 | 403) {
    super(code);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = status;
  }
}

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    (appRoles as readonly string[]).includes(value)
  );
}

export function hasPermission(
  role: unknown,
  permission: AppPermission,
): boolean {
  return (
    isAppRole(role) &&
    (permissionsByRole[role] as readonly AppPermission[]).includes(permission)
  );
}

export function canCreateRole(
  actorRole: unknown,
  roleToCreate: unknown,
): boolean {
  if (roleToCreate === "customer") {
    return hasPermission(actorRole, "customer:create");
  }

  if (roleToCreate === "administrator") {
    return hasPermission(actorRole, "administrator:create");
  }

  return false;
}

export function canManageUser(
  actorRole: unknown,
  targetRole: unknown,
  action: UserManagementAction,
): boolean {
  if (targetRole !== "customer" && targetRole !== "administrator") {
    return false;
  }

  return hasPermission(actorRole, targetPermission[targetRole][action]);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("AUTHENTICATION_REQUIRED", 401);
  }

  return user;
}

export async function requirePermission(
  permission: AppPermission,
): Promise<CurrentUser> {
  const user = await requireUser();

  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }

  return user;
}

export function assertCanCreateRole(
  actorRole: unknown,
  roleToCreate: unknown,
): void {
  if (!canCreateRole(actorRole, roleToCreate)) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }
}

export function assertCanManageUser(
  actorRole: unknown,
  targetRole: unknown,
  action: UserManagementAction,
): void {
  if (!canManageUser(actorRole, targetRole, action)) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }
}
