import { appRoles, type AppRole } from "@/lib/auth-roles";

export type AuthorizationErrorCode =
  "AUTHENTICATION_REQUIRED" | "PERMISSION_DENIED";

export const appPermissions = [
  "dashboard:view",
  "catalog:view",
  "catalog:manage",
  "order:view",
  "order:manage",
  "customer:create",
  "customer:view",
  "customer:update",
  "customer:block",
  "customer:password:reset",
  "customer:delete",
  "customer:change-role",
  "customer:sessions:list",
  "customer:sessions:revoke",
  "administrator:create",
  "administrator:view",
  "administrator:update",
  "administrator:block",
  "administrator:password:reset",
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
  | "password:reset"
  | "delete"
  | "change-role"
  | "sessions:list"
  | "sessions:revoke";

const permissionsByRole = {
  customer: [] as const,
  administrator: [
    "dashboard:view",
    "catalog:view",
    "catalog:manage",
    "order:view",
    "order:manage",
    "customer:create",
    "customer:view",
    "customer:update",
    "customer:block",
    "customer:password:reset",
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
    "password:reset": "customer:password:reset",
    delete: "customer:delete",
    "change-role": "customer:change-role",
    "sessions:list": "customer:sessions:list",
    "sessions:revoke": "customer:sessions:revoke",
  },
  administrator: {
    view: "administrator:view",
    update: "administrator:update",
    block: "administrator:block",
    "password:reset": "administrator:password:reset",
    delete: "administrator:delete",
    "change-role": "administrator:change-role",
    "sessions:list": "administrator:sessions:list",
    "sessions:revoke": "administrator:sessions:revoke",
  },
} satisfies Record<ManageableRole, Record<UserManagementAction, AppPermission>>;

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
    typeof value === "string" && (appRoles as readonly string[]).includes(value)
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
