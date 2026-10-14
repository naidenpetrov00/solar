import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  like,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import { session, user, verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { AppRole } from "@/lib/auth-roles";
import {
  assertCanCreateRole,
  assertCanManageUser,
  hasPermission,
  isAppRole,
  type AppPermission,
  type ManageableRole,
  type UserManagementAction,
} from "@/lib/authorization";

export const USERS_PAGE_SIZE = 25;
export const USERS_MAX_PAGE = 10_000;
export const USERS_SEARCH_MAX_LENGTH = 100;
export const MANAGEMENT_EMAIL_COOLDOWN_MS = 60_000;

export type ManagedUserAction =
  | "block"
  | "unblock"
  | "revoke-sessions"
  | "send-password-reset"
  | "promote"
  | "demote";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ManageableRole;
  emailVerified: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  actions: ManagedUserAction[];
};

export type ManagedUsersPage = {
  users: ManagedUser[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
};

export type UserManagementErrorCode =
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STALE"
  | "RATE_LIMITED"
  | "EMAIL_EXISTS"
  | "DELIVERY_FAILED";

export class UserManagementError extends Error {
  constructor(readonly code: UserManagementErrorCode) {
    super(code);
    this.name = "UserManagementError";
  }
}

function apiErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if (
    "body" in error &&
    typeof error.body === "object" &&
    error.body !== null &&
    "code" in error.body &&
    typeof error.body.code === "string"
  ) {
    return error.body.code;
  }
}

function manageableRoles(actorRole: unknown): ManageableRole[] {
  if (actorRole === "administrator") {
    return ["customer"];
  }

  if (actorRole === "admin") {
    return ["customer", "administrator"];
  }

  return [];
}

function actionsFor(actorRole: AppRole, target: {
  role: ManageableRole;
  blocked: boolean | null;
}): ManagedUserAction[] {
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

      return [{
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
      }];
    }),
    total,
    page,
    pageCount,
    query,
  };
}

function assertCurrentActorRole(
  role: unknown,
  permission?: AppPermission,
): asserts role is AppRole {
  if (!isAppRole(role) || (permission && !hasPermission(role, permission))) {
    throw new UserManagementError("FORBIDDEN");
  }
}

function assertCurrentTargetRole(
  actorRole: AppRole,
  targetRole: unknown,
  action: UserManagementAction,
): asserts targetRole is ManageableRole {
  try {
    assertCanManageUser(actorRole, targetRole, action);
  } catch {
    throw new UserManagementError("FORBIDDEN");
  }
}

function isFresh(actual: Date, expected: string) {
  return actual.toISOString() === expected;
}

async function lockActorAndTarget(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actorId: string,
  targetId: string,
) {
  const [actor] = await transaction
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1)
    .for("update");
  const [target] = await transaction
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      blocked: user.banned,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1)
    .for("update");

  if (!actor) {
    throw new UserManagementError("FORBIDDEN");
  }

  if (!target) {
    throw new UserManagementError("NOT_FOUND");
  }

  const actorRole = actor.role;
  assertCurrentActorRole(actorRole);
  return { actor: { ...actor, role: actorRole }, target };
}

export async function setManagedUserBlocked(input: {
  actorId: string;
  targetId: string;
  expectedUpdatedAt: string;
  blocked: boolean;
}) {
  await db.transaction(async (transaction) => {
    const { actor, target } = await lockActorAndTarget(
      transaction,
      input.actorId,
      input.targetId,
    );
    assertCurrentTargetRole(actor.role, target.role, "block");

    if (target.blocked !== input.blocked) {
      if (!isFresh(target.updatedAt, input.expectedUpdatedAt)) {
        throw new UserManagementError("STALE");
      }

      await transaction
        .update(user)
        .set({
          banned: input.blocked,
          banReason: input.blocked ? "Managed through dashboard" : null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, target.id));
    }

    if (input.blocked) {
      await transaction.delete(session).where(eq(session.userId, target.id));
    }
  });
}

export async function revokeManagedUserSessions(input: {
  actorId: string;
  targetId: string;
}) {
  await db.transaction(async (transaction) => {
    const { actor, target } = await lockActorAndTarget(
      transaction,
      input.actorId,
      input.targetId,
    );
    assertCurrentTargetRole(actor.role, target.role, "sessions:revoke");
    await transaction.delete(session).where(eq(session.userId, target.id));
  });
}

export async function changeManagedUserRole(input: {
  actorId: string;
  targetId: string;
  expectedUpdatedAt: string;
  nextRole: ManageableRole;
}) {
  await db.transaction(async (transaction) => {
    const { actor, target } = await lockActorAndTarget(
      transaction,
      input.actorId,
      input.targetId,
    );
    assertCurrentTargetRole(actor.role, target.role, "change-role");

    if (target.role !== input.nextRole) {
      if (!isFresh(target.updatedAt, input.expectedUpdatedAt)) {
        throw new UserManagementError("STALE");
      }

      const validTransition =
        (target.role === "customer" && input.nextRole === "administrator") ||
        (target.role === "administrator" && input.nextRole === "customer");

      if (!validTransition) {
        throw new UserManagementError("INVALID_INPUT");
      }

      await transaction
        .update(user)
        .set({ role: input.nextRole, updatedAt: new Date() })
        .where(eq(user.id, target.id));
    }

    await transaction.delete(session).where(eq(session.userId, target.id));
  });
}

export async function sendManagedPasswordReset(input: {
  actorId: string;
  targetId: string;
  redirectTo: string;
  requestHeaders: Headers;
}) {
  let deliveryFailed = false;

  await db.transaction(async (transaction) => {
    const { actor, target } = await lockActorAndTarget(
      transaction,
      input.actorId,
      input.targetId,
    );
    assertCurrentTargetRole(actor.role, target.role, "password:reset");
    const [recentRequest] = await transaction
      .select({ id: verification.id })
      .from(verification)
      .where(
        and(
          eq(verification.value, target.id),
          like(verification.identifier, "reset-password:%"),
          gt(
            verification.createdAt,
            new Date(Date.now() - MANAGEMENT_EMAIL_COOLDOWN_MS),
          ),
        ),
      )
      .limit(1);

    if (recentRequest) {
      throw new UserManagementError("RATE_LIMITED");
    }

    await transaction
      .delete(verification)
      .where(
        and(
          eq(verification.value, target.id),
          like(verification.identifier, "reset-password:%"),
        ),
      );

    try {
      await auth.api.requestPasswordReset({
        body: { email: target.email, redirectTo: input.redirectTo },
        headers: input.requestHeaders,
      });
    } catch {
      await transaction
        .delete(verification)
        .where(
          and(
            eq(verification.value, target.id),
            like(verification.identifier, "reset-password:%"),
          ),
        );
      deliveryFailed = true;
    }
  });

  if (deliveryFailed) {
    throw new UserManagementError("DELIVERY_FAILED");
  }
}

export async function createAdministrator(input: {
  actorId: string;
  name: string;
  email: string;
  requestHeaders: Headers;
}) {
  const [actor] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, input.actorId))
    .limit(1);

  if (!actor) {
    throw new UserManagementError("FORBIDDEN");
  }

  assertCurrentActorRole(actor.role);

  try {
    assertCanCreateRole(actor.role, "administrator");
  } catch {
    throw new UserManagementError("FORBIDDEN");
  }

  try {
    const result = await auth.api.createUser({
      body: {
        name: input.name,
        email: input.email,
        role: "administrator",
      },
      headers: input.requestHeaders,
    });

    if (!result.user || result.user.role !== "administrator") {
      throw new UserManagementError("INVALID_INPUT");
    }

    return result.user;
  } catch (error) {
    if (error instanceof UserManagementError) {
      throw error;
    }

    if (apiErrorCode(error) === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      throw new UserManagementError("EMAIL_EXISTS");
    }

    throw new UserManagementError("INVALID_INPUT");
  }
}
