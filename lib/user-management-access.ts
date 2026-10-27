import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import type { AppRole } from "@/lib/auth-roles";
import {
  assertCanManageUser,
  hasPermission,
  isAppRole,
} from "@/lib/permission-policy";
import type {
  AppPermission,
  ManageableRole,
  UserManagementAction,
} from "@/lib/permission-policy";
import { UserManagementError } from "@/lib/user-management-model";

export function assertCurrentActorRole(
  role: unknown,
  permission?: AppPermission,
): asserts role is AppRole {
  if (!isAppRole(role) || (permission && !hasPermission(role, permission))) {
    throw new UserManagementError("FORBIDDEN");
  }
}

export function assertCurrentTargetRole(
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

export function isFresh(actual: Date, expected: string) {
  return actual.toISOString() === expected;
}

export async function lockActorAndTarget(
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
