import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import type { AppRole } from "@/lib/auth-roles";
import { hasPermission, isAppRole } from "@/lib/permission-policy";
import type { ManageableRole } from "@/lib/permission-policy";
import {
  USERS_MAX_PAGE,
  USERS_PAGE_SIZE,
  USERS_SEARCH_MAX_LENGTH,
  UserManagementError,
  type ManagedUserAction,
  type ManagedUsersPage,
} from "@/lib/user-management-model";

function manageableRoles(actorRole: unknown): ManageableRole[] {
  if (actorRole === "administrator") {
    return ["customer"];
  }

  if (actorRole === "admin") {
    return ["customer", "administrator"];
  }

  return [];
}

function actionsFor(
  actorRole: AppRole,
  target: {
    role: ManageableRole;
    blocked: boolean | null;
  },
): ManagedUserAction[] {
  const actions: ManagedUserAction[] = [
    target.blocked ? "unblock" : "block",
    "revoke-sessions",
    "send-password-reset",
  ];

  if (actorRole === "admin") {
    actions.push(target.role === "customer" ? "promote" : "demote");
  }

  return actions;
}

function parsePage(value: string | string[] | undefined) {
  const candidate = typeof value === "string" ? Number(value) : 1;

  if (!Number.isSafeInteger(candidate) || candidate < 1) {
    return 1;
  }

  return Math.min(candidate, USERS_MAX_PAGE);
}

export function normalizeUsersQuery(value: string | string[] | undefined) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/gu, " ").slice(0, USERS_SEARCH_MAX_LENGTH)
    : "";
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/gu, "\\$&");
}

export async function listManagedUsers(
  actorId: string,
  search: string | string[] | undefined,
  requestedPage: string | string[] | undefined,
): Promise<ManagedUsersPage> {
  const [actor] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  const actorRole = actor?.role;

  if (!isAppRole(actorRole) || !hasPermission(actorRole, "dashboard:view")) {
    throw new UserManagementError("FORBIDDEN");
  }

  const roles = manageableRoles(actorRole);

  if (roles.length === 0) {
    throw new UserManagementError("FORBIDDEN");
  }

  const query = normalizeUsersQuery(search);
  const rolePredicate = inArray(user.role, roles);
  const pattern = `%${escapeLikePattern(query)}%`;
  const searchPredicate = query
    ? or(ilike(user.name, pattern), ilike(user.email, pattern))
    : undefined;
  const predicate = searchPredicate
    ? and(rolePredicate, searchPredicate)
    : rolePredicate;
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(user)
    .where(predicate);
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const page = Math.min(parsePage(requestedPage), pageCount);
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      blocked: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(predicate)
    .orderBy(desc(user.createdAt), asc(user.id))
    .limit(USERS_PAGE_SIZE)
    .offset((page - 1) * USERS_PAGE_SIZE);

  return {
    users: rows.flatMap((row) => {
      if (row.role !== "customer" && row.role !== "administrator") {
        return [];
      }

      return [
        {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          emailVerified: row.emailVerified,
          blocked: row.blocked === true,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          actions: actionsFor(actorRole, {
            role: row.role,
            blocked: row.blocked,
          }),
        },
      ];
    }),
    total,
    page,
    pageCount,
    query,
  };
}
