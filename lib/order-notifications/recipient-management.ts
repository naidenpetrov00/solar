import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderNotificationRecipient } from "@/db/schema";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { isUuid } from "@/lib/catalog/model";
import { OrderNotificationError } from "@/lib/order-notifications/errors";
import { normalizeNotificationRecipient } from "@/lib/order-notifications/validation";

export type ManagedNotificationRecipient = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  mutationVersion: number;
  createdAt: string;
  updatedAt: string;
};

function duplicateEmail(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505",
  );
}

export async function listNotificationRecipients(
  actorId: string,
): Promise<ManagedNotificationRecipient[]> {
  await getOrderActor(db, actorId, "order:view");
  const rows = await db
    .select()
    .from(orderNotificationRecipient)
    .orderBy(
      desc(orderNotificationRecipient.active),
      asc(orderNotificationRecipient.name),
      asc(orderNotificationRecipient.createdAt),
    );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    mutationVersion: row.mutationVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createNotificationRecipient(input: {
  actorId: string;
  name: string;
  email: string;
}) {
  const recipient = normalizeNotificationRecipient(input);
  try {
    return await db.transaction(async (transaction) => {
      await getOrderActor(transaction, input.actorId, "order:manage", true);
      const [created] = await transaction
        .insert(orderNotificationRecipient)
        .values(recipient)
        .returning({
          id: orderNotificationRecipient.id,
          mutationVersion: orderNotificationRecipient.mutationVersion,
        });
      return created;
    });
  } catch (error) {
    if (duplicateEmail(error)) {
      throw new OrderNotificationError("DUPLICATE_ACTIVE_EMAIL");
    }
    throw error;
  }
}

export async function updateNotificationRecipient(input: {
  actorId: string;
  recipientId: string;
  expectedVersion: number;
  name: string;
  email: string;
  active: boolean;
}) {
  if (
    !isUuid(input.recipientId) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 1
  ) {
    throw new OrderNotificationError("INVALID_INPUT");
  }
  const recipient = normalizeNotificationRecipient(input);
  try {
    return await db.transaction(async (transaction) => {
      await getOrderActor(transaction, input.actorId, "order:manage", true);
      const [current] = await transaction
        .select()
        .from(orderNotificationRecipient)
        .where(eq(orderNotificationRecipient.id, input.recipientId))
        .limit(1)
        .for("update");
      if (!current) throw new OrderNotificationError("NOT_FOUND");
      if (current.mutationVersion !== input.expectedVersion) {
        throw new OrderNotificationError("STALE");
      }
      const now = new Date();
      const nextVersion = current.mutationVersion + 1;
      await transaction
        .update(orderNotificationRecipient)
        .set({
          ...recipient,
          active: input.active,
          mutationVersion: nextVersion,
          updatedAt: now,
        })
        .where(eq(orderNotificationRecipient.id, current.id));
      return { id: current.id, mutationVersion: nextVersion };
    });
  } catch (error) {
    if (duplicateEmail(error)) {
      throw new OrderNotificationError("DUPLICATE_ACTIVE_EMAIL");
    }
    throw error;
  }
}
