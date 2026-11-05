import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orderNotificationRecipient } from "@/db/schema";
import { usableOrderNotificationUser } from "@/lib/order-notifications/user-recipient";
import { hasPermission } from "@/lib/permission-policy";
import {
  assertCurrentTargetRole,
  lockActorAndTarget,
} from "@/lib/user-management-access";
import { UserManagementError } from "@/lib/user-management-model";

export async function setManagedUserOrderEmailPreference(input: {
  actorId: string;
  targetId: string;
  expectedVersion: number;
  enabled: boolean;
}) {
  return db.transaction(async (transaction) => {
    const { actor, target } = await lockActorAndTarget(
      transaction,
      input.actorId,
      input.targetId,
    );
    const isSelfAdmin =
      actor.id === target.id &&
      actor.role === "admin" &&
      target.role === "admin";
    if (!isSelfAdmin) {
      assertCurrentTargetRole(actor.role, target.role, "update");
    }

    if (!hasPermission(target.role, "order:view")) {
      throw new UserManagementError("FORBIDDEN");
    }

    const recipient = usableOrderNotificationUser(target);
    if (!recipient) {
      throw new UserManagementError("INVALID_INPUT");
    }

    const [current] = await transaction
      .select({
        id: orderNotificationRecipient.id,
        active: orderNotificationRecipient.active,
        mutationVersion: orderNotificationRecipient.mutationVersion,
      })
      .from(orderNotificationRecipient)
      .where(eq(orderNotificationRecipient.userId, target.id))
      .limit(1)
      .for("update");

    if (current?.active === input.enabled || (!current && !input.enabled)) {
      return {
        mutationVersion: current?.mutationVersion ?? 0,
      };
    }

    const currentVersion = current?.mutationVersion ?? 0;
    if (currentVersion !== input.expectedVersion) {
      throw new UserManagementError("STALE");
    }

    if (!current) {
      const [created] = await transaction
        .insert(orderNotificationRecipient)
        .values({
          userId: target.id,
          name: recipient.name,
          email: recipient.email,
          emailNormalized: recipient.emailNormalized,
          active: true,
        })
        .returning({
          mutationVersion: orderNotificationRecipient.mutationVersion,
        });

      if (!created) throw new UserManagementError("INVALID_INPUT");
      return { mutationVersion: created.mutationVersion };
    }

    const mutationVersion = current.mutationVersion + 1;
    await transaction
      .update(orderNotificationRecipient)
      .set({ active: input.enabled, mutationVersion })
      .where(eq(orderNotificationRecipient.id, current.id));

    return { mutationVersion };
  });
}
