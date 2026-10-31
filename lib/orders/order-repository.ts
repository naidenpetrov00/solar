import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  salesOrder,
  salesOrderAuditEvent,
  salesOrderItemSnapshot,
  salesOrderPriceAdjustment,
  salesOrderRevision,
} from "@/db/schema";
import { OrderError } from "@/lib/orders/errors";
import type {
  OrderExecutor,
  OrderTransaction,
} from "@/lib/orders/repository-types";

export async function lockSalesOrder(
  transaction: OrderTransaction,
  orderId: string,
) {
  const [order] = await transaction
    .select()
    .from(salesOrder)
    .where(eq(salesOrder.id, orderId))
    .limit(1)
    .for("update");
  if (!order) throw new OrderError("NOT_FOUND");
  return order;
}

export async function loadOrderRevisionAggregate(
  executor: OrderExecutor,
  orderId: string,
  revisionNumber: number,
) {
  const [revision] = await executor
    .select()
    .from(salesOrderRevision)
    .where(
      and(
        eq(salesOrderRevision.orderId, orderId),
        eq(salesOrderRevision.revisionNumber, revisionNumber),
      ),
    )
    .limit(1);
  if (!revision) throw new OrderError("NOT_FOUND");
  const [items, adjustments] = await Promise.all([
    executor
      .select()
      .from(salesOrderItemSnapshot)
      .where(eq(salesOrderItemSnapshot.revisionId, revision.id))
      .orderBy(asc(salesOrderItemSnapshot.position)),
    executor
      .select()
      .from(salesOrderPriceAdjustment)
      .where(eq(salesOrderPriceAdjustment.revisionId, revision.id))
      .orderBy(asc(salesOrderPriceAdjustment.createdAt)),
  ]);
  return { revision, items, adjustments };
}

export async function loadOrderAggregate(
  executor: OrderExecutor,
  orderId: string,
  revisionNumber?: number,
) {
  const [order] = await executor
    .select()
    .from(salesOrder)
    .where(eq(salesOrder.id, orderId))
    .limit(1);
  if (!order) throw new OrderError("NOT_FOUND");
  const content = await loadOrderRevisionAggregate(
    executor,
    orderId,
    revisionNumber ?? order.currentRevisionNumber,
  );
  const events = await executor
    .select()
    .from(salesOrderAuditEvent)
    .where(eq(salesOrderAuditEvent.orderId, orderId))
    .orderBy(asc(salesOrderAuditEvent.mutationVersion));
  return { order, ...content, events };
}
