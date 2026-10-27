import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { session, user } from "@/db/schema";
import type { ManageableRole } from "@/lib/permission-policy";
import {
  assertCurrentTargetRole,
  isFresh,
  lockActorAndTarget,
} from "@/lib/user-management-access";
import { UserManagementError } from "@/lib/user-management-model";

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
