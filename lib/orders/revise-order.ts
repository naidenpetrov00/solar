import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderAuditEvent } from "@/db/schema";
import type { CatalogLocale } from "@/lib/catalog/model";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { snapshotCatalogOrderItems } from "@/lib/orders/catalog-snapshot";
import { prepareRevisionCalculation } from "@/lib/orders/calculation";
import { OrderError } from "@/lib/orders/errors";
import {
  loadOrderRevisionAggregate,
  lockSalesOrder,
} from "@/lib/orders/order-repository";
import { persistOrderRevision } from "@/lib/orders/persist-revision";
import { buildRevisionChanges } from "@/lib/orders/revision-diff";
import { normalizeRevisionInput } from "@/lib/orders/revision-input";
import { snapshotFromStoredItem } from "@/lib/orders/stored-item-snapshot";
import type { ReviseOrderInput } from "@/lib/orders/types";

export async function reviseOrder(rawInput: ReviseOrderInput) {
  const { customer, lines, orderAdjustments } = normalizeRevisionInput(rawInput);

  return db.transaction(async (transaction) => {
    const actor = await getOrderActor(
      transaction,
      rawInput.actorId,
      "order:manage",
      true,
    );
    const order = await lockSalesOrder(transaction, rawInput.orderId);
    if (order.mutationVersion !== rawInput.expectedVersion) {
      throw new OrderError("STALE");
    }
    if (
      order.status === "rejected" ||
      order.status === "cancelled" ||
      order.status === "completed"
    ) {
      throw new OrderError("TERMINAL_ORDER");
    }
    const current = await loadOrderRevisionAggregate(
      transaction,
      order.id,
      order.currentRevisionNumber,
    );
    const currentByLineKey = new Map(
      current.items.map((item) => [item.lineKey, item]),
    );
    const newProductIds = lines.flatMap((line) =>
      "productId" in line ? [line.productId] : [],
    );
    const freshCatalog = await snapshotCatalogOrderItems(
      transaction,
      rawInput.locale as CatalogLocale,
      newProductIds,
      new Date(),
    );
    const lineKeys = new Set<string>();
    const productIds = new Set<string>();
    const drafts = lines.map((line) => {
      if ("lineKey" in line) {
        if (lineKeys.has(line.lineKey)) throw new OrderError("INVALID_INPUT");
        lineKeys.add(line.lineKey);
        const existing = currentByLineKey.get(line.lineKey);
        if (!existing) throw new OrderError("INVALID_INPUT");
        if (productIds.has(existing.sourceProductId)) {
          throw new OrderError("INVALID_INPUT");
        }
        productIds.add(existing.sourceProductId);
        return {
          lineKey: line.lineKey,
          snapshot: snapshotFromStoredItem(existing),
          quantity: line.quantity,
          adjustments: line.adjustments,
        };
      }
      const snapshot = freshCatalog.get(line.productId);
      if (!snapshot || productIds.has(line.productId)) {
        throw new OrderError("INVALID_INPUT");
      }
      productIds.add(line.productId);
      return {
        snapshot,
        quantity: line.quantity,
        adjustments: line.adjustments,
      };
    });
    const calculation = prepareRevisionCalculation({
      actor,
      lines: drafts,
      orderAdjustments,
    });
    const changes = buildRevisionChanges(current, {
      locale: rawInput.locale,
      customer,
      paymentMethod: rawInput.paymentMethod,
      calculation,
    });
    if (!changes.length) throw new OrderError("INVALID_INPUT");
    const nextRevision = order.currentRevisionNumber + 1;
    const nextVersion = order.mutationVersion + 1;
    await persistOrderRevision(transaction, {
      orderId: order.id,
      revisionNumber: nextRevision,
      revisionKind: "administrator_edit",
      locale: rawInput.locale,
      customer,
      paymentMethod: rawInput.paymentMethod,
      calculation,
      actor,
    });
    const updatedAt = new Date();
    await transaction
      .update(salesOrder)
      .set({
        currentRevisionNumber: nextRevision,
        mutationVersion: nextVersion,
        updatedAt,
      })
      .where(eq(salesOrder.id, order.id));
    await transaction.insert(salesOrderAuditEvent).values({
      orderId: order.id,
      eventType: "content_revised",
      mutationVersion: nextVersion,
      fromRevisionNumber: order.currentRevisionNumber,
      toRevisionNumber: nextRevision,
      changes,
      actorKind: "administrator",
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      revisionNumber: nextRevision,
      mutationVersion: nextVersion,
      updatedAt: updatedAt.toISOString(),
    };
  });
}
