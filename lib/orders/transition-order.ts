import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderAuditEvent } from "@/db/schema";
import { isUuid } from "@/lib/catalog/model";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { OrderError } from "@/lib/orders/errors";
import {
  canTransitionOrder,
  isOrderStatus,
} from "@/lib/orders/model";
import { lockSalesOrder } from "@/lib/orders/order-repository";
import type { TransitionOrderStatusInput } from "@/lib/orders/types";

export async function transitionOrderStatus(
  input: TransitionOrderStatusInput,
) {
  if (
    !isUuid(input.orderId) ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 1 ||
    !isOrderStatus(input.status)
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  return db.transaction(async (transaction) => {
    const actor = await getOrderActor(
      transaction,
      input.actorId,
      "order:manage",
      true,
    );
    const order = await lockSalesOrder(transaction, input.orderId);
    if (order.mutationVersion !== input.expectedVersion) {
      throw new OrderError("STALE");
    }
    if (
      !isOrderStatus(order.status) ||
      !canTransitionOrder(order.status, input.status)
    ) {
      throw new OrderError("INVALID_STATUS_TRANSITION");
    }
    const now = new Date();
    const nextVersion = order.mutationVersion + 1;
    await transaction
      .update(salesOrder)
      .set({
        status: input.status,
        mutationVersion: nextVersion,
        updatedAt: now,
        ...(input.status === "approved" ? { approvedAt: now } : {}),
        ...(input.status === "rejected" ? { rejectedAt: now } : {}),
        ...(input.status === "cancelled" ? { cancelledAt: now } : {}),
        ...(input.status === "completed" ? { completedAt: now } : {}),
      })
      .where(eq(salesOrder.id, order.id));
    await transaction.insert(salesOrderAuditEvent).values({
      orderId: order.id,
      eventType: "order_status_changed",
      mutationVersion: nextVersion,
      fromRevisionNumber: order.currentRevisionNumber,
      toRevisionNumber: order.currentRevisionNumber,
      fromOrderStatus: order.status,
      toOrderStatus: input.status,
      changes: [
        { field: "status", before: order.status, after: input.status },
      ],
      actorKind: "administrator",
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: input.status,
      mutationVersion: nextVersion,
      updatedAt: now.toISOString(),
    };
  });
}
