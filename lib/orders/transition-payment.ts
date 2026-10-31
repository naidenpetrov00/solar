import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderAuditEvent } from "@/db/schema";
import { isUuid } from "@/lib/catalog/model";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { OrderError } from "@/lib/orders/errors";
import {
  canTransitionPayment,
  isOrderPaymentStatus,
} from "@/lib/orders/model";
import { lockSalesOrder } from "@/lib/orders/order-repository";
import type { TransitionPaymentStatusInput } from "@/lib/orders/types";

export async function transitionPaymentStatus(
  input: TransitionPaymentStatusInput,
) {
  if (
    !isUuid(input.orderId) ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 1 ||
    !isOrderPaymentStatus(input.paymentStatus)
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
      !isOrderPaymentStatus(order.paymentStatus) ||
      !canTransitionPayment(order.paymentStatus, input.paymentStatus)
    ) {
      throw new OrderError("INVALID_PAYMENT_TRANSITION");
    }
    const now = new Date();
    const nextVersion = order.mutationVersion + 1;
    await transaction
      .update(salesOrder)
      .set({
        paymentStatus: input.paymentStatus,
        paymentStatusUpdatedAt: now,
        mutationVersion: nextVersion,
        updatedAt: now,
        ...(input.paymentStatus === "paid" && !order.paidAt
          ? { paidAt: now }
          : {}),
        ...(input.paymentStatus === "refunded" ? { refundedAt: now } : {}),
      })
      .where(eq(salesOrder.id, order.id));
    await transaction.insert(salesOrderAuditEvent).values({
      orderId: order.id,
      eventType: "payment_status_changed",
      mutationVersion: nextVersion,
      fromRevisionNumber: order.currentRevisionNumber,
      toRevisionNumber: order.currentRevisionNumber,
      fromPaymentStatus: order.paymentStatus,
      toPaymentStatus: input.paymentStatus,
      changes: [
        {
          field: "paymentStatus",
          before: order.paymentStatus,
          after: input.paymentStatus,
        },
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
      orderStatus: order.status,
      paymentStatus: input.paymentStatus,
      revisionNumber: order.currentRevisionNumber,
      mutationVersion: nextVersion,
      updatedAt: now.toISOString(),
    };
  });
}
