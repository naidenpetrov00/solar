import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, gt, like, or } from "drizzle-orm";

import { db } from "@/db";
import { verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  assertCurrentTargetRole,
  lockActorAndTarget,
} from "@/lib/user-management-access";
import {
  MANAGEMENT_EMAIL_COOLDOWN_MS,
  UserManagementError,
} from "@/lib/user-management-model";

const MANAGEMENT_RESET_RESERVATION_PREFIX = "managed-reset-reservation:";

export async function sendManagedPasswordReset(input: {
  actorId: string;
  targetId: string;
  redirectTo: string;
  requestHeaders: Headers;
}) {
  const reservationId = randomUUID();
  const reservationIdentifier = `${MANAGEMENT_RESET_RESERVATION_PREFIX}${input.targetId}`;
  const target = await db.transaction(async (transaction) => {
    const { actor, target } = await lockActorAndTarget(
      transaction,
      input.actorId,
      input.targetId,
    );
    assertCurrentTargetRole(actor.role, target.role, "password:reset");
    const reservedAt = new Date();
    const [recentRequest] = await transaction
      .select({ id: verification.id })
      .from(verification)
      .where(
        and(
          eq(verification.value, target.id),
          or(
            like(verification.identifier, "reset-password:%"),
            eq(verification.identifier, reservationIdentifier),
          ),
          gt(
            verification.createdAt,
            new Date(reservedAt.getTime() - MANAGEMENT_EMAIL_COOLDOWN_MS),
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
          or(
            like(verification.identifier, "reset-password:%"),
            eq(verification.identifier, reservationIdentifier),
          ),
        ),
      );

    await transaction.insert(verification).values({
      id: reservationId,
      identifier: reservationIdentifier,
      value: target.id,
      expiresAt: new Date(reservedAt.getTime() + MANAGEMENT_EMAIL_COOLDOWN_MS),
      createdAt: reservedAt,
      updatedAt: reservedAt,
    });

    return { id: target.id, email: target.email };
  });

  try {
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: input.redirectTo },
      headers: input.requestHeaders,
    });
  } catch {
    try {
      await cleanupManagedPasswordReset({
        targetId: target.id,
        reservationId,
        reservationIdentifier,
        removeResetTokens: true,
      });
    } catch {
      console.error({ event: "managed_password_reset_failure_cleanup_failed" });
    }

    throw new UserManagementError("DELIVERY_FAILED");
  }

  try {
    await cleanupManagedPasswordReset({
      targetId: target.id,
      reservationId,
      reservationIdentifier,
      removeResetTokens: false,
    });
  } catch {
    // The delivered Better Auth token remains valid and enforces the cooldown.
    // The reservation expires after the same bounded cooldown window.
    console.error({
      event: "managed_password_reset_reservation_cleanup_failed",
    });
  }
}

async function cleanupManagedPasswordReset(input: {
  targetId: string;
  reservationId: string;
  reservationIdentifier: string;
  removeResetTokens: boolean;
}) {
  await db.transaction(async (transaction) => {
    if (input.removeResetTokens) {
      await transaction
        .delete(verification)
        .where(
          and(
            eq(verification.value, input.targetId),
            like(verification.identifier, "reset-password:%"),
          ),
        );
    }

    await transaction
      .delete(verification)
      .where(
        and(
          eq(verification.id, input.reservationId),
          eq(verification.value, input.targetId),
          eq(verification.identifier, input.reservationIdentifier),
        ),
      );
  });
}
