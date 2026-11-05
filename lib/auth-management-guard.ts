import "server-only";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

type UnknownRecord = Record<string, unknown>;

const ownerProtectedUserPaths = new Set([
  "/admin/set-role",
  "/admin/get-user",
  "/admin/update-user",
  "/admin/list-user-sessions",
  "/admin/unban-user",
  "/admin/ban-user",
  "/admin/impersonate-user",
  "/admin/revoke-user-sessions",
  "/admin/remove-user",
]);

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function includesRole(value: unknown, role: string): boolean {
  const roles = Array.isArray(value) ? value : [value];

  return roles.some(
    (candidate) =>
      typeof candidate === "string" &&
      candidate.split(",").some((item) => item.trim() === role),
  );
}

function throwAuthInvariantError(code: string, message: string): never {
  throw new APIError("FORBIDDEN", { code, message });
}

async function getUserRole(userId: unknown): Promise<string | null> {
  if (typeof userId !== "string" || !userId) {
    return null;
  }

  const [target] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return target?.role ?? null;
}

async function getSessionUserRole(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token) {
    return null;
  }

  const [target] = await db
    .select({ role: schema.user.role })
    .from(schema.session)
    .innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
    .where(eq(schema.session.token, token))
    .limit(1);

  return target?.role ?? null;
}

export async function enforceManagementRequestInvariants(
  path: string,
  bodyValue: unknown,
  queryValue: unknown,
) {
  const body = asRecord(bodyValue) ?? {};
  const query = asRecord(queryValue) ?? {};

  if (path === "/admin/create-user") {
    const data = asRecord(body.data);
    const requestedRole = body.role ?? data?.role;

    if (includesRole(requestedRole, "admin")) {
      throwAuthInvariantError(
        "ADMIN_ROLE_CREATION_FORBIDDEN",
        "The owner role cannot be created through a management request.",
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "password")) {
      throwAuthInvariantError(
        "DIRECT_PASSWORD_MANAGEMENT_FORBIDDEN",
        "Management requests must use password-reset delivery.",
      );
    }

    return;
  }

  if (path === "/admin/set-user-password") {
    throwAuthInvariantError(
      "DIRECT_PASSWORD_MANAGEMENT_FORBIDDEN",
      "Management requests must use password-reset delivery.",
    );
  }

  if (path === "/admin/set-role" && includesRole(body.role, "admin")) {
    throwAuthInvariantError(
      "ADMIN_ROLE_ASSIGNMENT_FORBIDDEN",
      "The owner role cannot be assigned through a management request.",
    );
  }

  if (path === "/admin/update-user") {
    const data = asRecord(body.data);

    if (includesRole(data?.role, "admin")) {
      throwAuthInvariantError(
        "ADMIN_ROLE_ASSIGNMENT_FORBIDDEN",
        "The owner role cannot be assigned through a management request.",
      );
    }
  }

  let targetRole: string | null = null;

  if (ownerProtectedUserPaths.has(path)) {
    targetRole = await getUserRole(
      path === "/admin/get-user" ? query.id : body.userId,
    );
  } else if (path === "/admin/revoke-user-session") {
    targetRole = await getSessionUserRole(body.sessionToken);
  }

  if (targetRole === "admin") {
    throwAuthInvariantError(
      "OWNER_ACCOUNT_PROTECTED",
      "Management endpoints cannot target the owner account.",
    );
  }
}
