import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderAuditEvent } from "@/db/schema";
import { snapshotCatalogOrderItems } from "@/lib/orders/catalog-snapshot";
import { prepareRevisionCalculation } from "@/lib/orders/calculation";
import { OrderError } from "@/lib/orders/errors";
import { guestOrderFingerprint } from "@/lib/orders/fingerprint";
import { persistOrderRevision } from "@/lib/orders/persist-revision";
import type { GuestOrderInput } from "@/lib/orders/types";
import { normalizeGuestOrderInput } from "@/lib/orders/validation";

export async function createGuestOrder(rawInput: GuestOrderInput) {
  const input = normalizeGuestOrderInput(rawInput);
  const fingerprint = guestOrderFingerprint({
    locale: input.locale,
    paymentMethod: input.paymentMethod,
    customer: input.customer,
    items: input.items,
  });
  return db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(salesOrder)
      .values({
        submissionKey: input.submissionKey,
        submissionFingerprint: fingerprint,
      })
      .onConflictDoNothing({ target: salesOrder.submissionKey })
      .returning({
        id: salesOrder.id,
        orderNumber: salesOrder.orderNumber,
        status: salesOrder.status,
        paymentStatus: salesOrder.paymentStatus,
        mutationVersion: salesOrder.mutationVersion,
      });
    if (!created) {
      const [existing] = await transaction
        .select({
          id: salesOrder.id,
          orderNumber: salesOrder.orderNumber,
          status: salesOrder.status,
          paymentStatus: salesOrder.paymentStatus,
          mutationVersion: salesOrder.mutationVersion,
          submissionFingerprint: salesOrder.submissionFingerprint,
        })
        .from(salesOrder)
        .where(eq(salesOrder.submissionKey, input.submissionKey))
        .limit(1);
      if (!existing || existing.submissionFingerprint !== fingerprint) {
        throw new OrderError("CONFLICT");
      }
      return {
        id: existing.id,
        orderNumber: existing.orderNumber,
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        mutationVersion: existing.mutationVersion,
        existing: true,
      };
    }
    const catalog = await snapshotCatalogOrderItems(
      transaction,
      input.locale,
      input.items.map(({ productId }) => productId),
      new Date(),
    );
    const calculation = prepareRevisionCalculation({
      actor: null,
      orderAdjustments: [],
      lines: input.items.map((item) => {
        const snapshot = catalog.get(item.productId);
        if (!snapshot) throw new OrderError("INVALID_INPUT");
        return { snapshot, quantity: item.quantity, adjustments: [] };
      }),
    });
    await persistOrderRevision(transaction, {
      orderId: created.id,
      revisionNumber: 1,
      revisionKind: "customer_submission",
      locale: input.locale,
      customer: input.customer,
      paymentMethod: input.paymentMethod,
      calculation,
      actor: null,
    });
    await transaction.insert(salesOrderAuditEvent).values({
      orderId: created.id,
      eventType: "submitted",
      mutationVersion: 1,
      toRevisionNumber: 1,
      toOrderStatus: "pending_approval",
      toPaymentStatus: "unpaid",
      changes: [
        { field: "order", before: null, after: { orderNumber: created.orderNumber } },
      ],
      actorKind: "guest",
    });
    return { ...created, existing: false };
  });
}
