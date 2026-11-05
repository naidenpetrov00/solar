import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderAuditEvent } from "@/db/schema";
import { enqueueNewOrderNotifications } from "@/lib/order-notifications/enqueue";
import { snapshotCatalogOrderItems } from "@/lib/orders/catalog-snapshot";
import { prepareRevisionCalculation } from "@/lib/orders/calculation";
import { OrderError } from "@/lib/orders/errors";
import { checkoutOrderFingerprint } from "@/lib/orders/fingerprint";
import { persistOrderRevision } from "@/lib/orders/persist-revision";
import type { CheckoutOrderInput } from "@/lib/orders/types";
import { normalizeCheckoutOrderInput } from "@/lib/orders/validation";
import { isAppRole } from "@/lib/permission-policy";

type CheckoutActor = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

export async function createCheckoutOrder(
  rawInput: CheckoutOrderInput,
  actor: CheckoutActor | null,
) {
  const input = normalizeCheckoutOrderInput(rawInput);
  if (actor && !isAppRole(actor.role)) {
    throw new OrderError("INVALID_INPUT");
  }
  const customerUserId = actor?.id ?? null;
  const fingerprint = checkoutOrderFingerprint(
    {
      locale: input.locale,
      paymentMethod: input.paymentMethod,
      customer: input.customer,
      items: input.items,
    },
    customerUserId,
  );
  return db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(salesOrder)
      .values({
        submissionKey: input.submissionKey,
        submissionFingerprint: fingerprint,
        customerUserId,
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
          customerUserId: salesOrder.customerUserId,
        })
        .from(salesOrder)
        .where(eq(salesOrder.submissionKey, input.submissionKey))
        .limit(1);
      if (
        !existing ||
        existing.submissionFingerprint !== fingerprint ||
        existing.customerUserId !== customerUserId
      ) {
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
    const revision = await persistOrderRevision(transaction, {
      orderId: created.id,
      revisionNumber: 1,
      revisionKind: "customer_submission",
      locale: input.locale,
      customer: input.customer,
      paymentMethod: input.paymentMethod,
      calculation,
      actor: null,
    });
    const [event] = await transaction
      .insert(salesOrderAuditEvent)
      .values({
        orderId: created.id,
        eventType: "submitted",
        mutationVersion: 1,
        toRevisionNumber: 1,
        toOrderStatus: "pending_approval",
        toPaymentStatus: "unpaid",
        changes: [
          { field: "order", before: null, after: { orderNumber: created.orderNumber } },
        ],
        actorKind: actor ? "customer" : "guest",
        actorUserId: actor?.id,
        actorName: actor?.name,
        actorEmail: actor?.email,
        actorRole: actor?.role,
      })
      .returning({ id: salesOrderAuditEvent.id });
    await enqueueNewOrderNotifications(transaction, {
      orderId: created.id,
      sourceAuditEventId: event.id,
      revision: {
        id: revision.id,
        revisionNumber: 1,
        locale: input.locale,
        customerName: input.customer.name,
        customerEmail: input.customer.email,
      },
    });
    return { ...created, existing: false };
  });
}
