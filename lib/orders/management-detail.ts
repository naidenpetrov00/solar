import "server-only";

import { db } from "@/db";
import { isCatalogLocale } from "@/lib/catalog/model";
import {
  isOrderNotificationErrorCode,
  isOrderNotificationKind,
  isOrderNotificationStatus,
} from "@/lib/order-notifications/model";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { OrderError } from "@/lib/orders/errors";
import type {
  ManagedOrderActor,
  ManagedOrderAdjustment,
  ManagedOrderAuditChange,
  ManagedOrderDetail,
  ManagedOrderRevision,
} from "@/lib/orders/management-model";
import {
  isOrderPaymentMethod,
  isOrderPaymentStatus,
  isOrderStatus,
} from "@/lib/orders/model";
import { loadOrderHistoryAggregate } from "@/lib/orders/order-repository";

type Aggregate = Awaited<ReturnType<typeof loadOrderHistoryAggregate>>;
type AuditRow = Aggregate["events"][number];

function administratorActor(row: {
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
}): Exclude<ManagedOrderActor, { kind: "guest" }> {
  if (
    !row.actorName ||
    !row.actorEmail ||
    (row.actorRole !== "administrator" && row.actorRole !== "admin")
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  return {
    kind: "administrator",
    name: row.actorName,
    email: row.actorEmail,
    role: row.actorRole,
  };
}

function auditActor(row: AuditRow): ManagedOrderActor {
  return row.actorKind === "guest" ? { kind: "guest" } : administratorActor(row);
}

function scalar(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  return undefined;
}

function auditChanges(rows: AuditRow["changes"]): ManagedOrderAuditChange[] {
  return rows.map((change) => {
    if (change.field === "items" || change.field === "adjustments") {
      return {
        kind: "collection",
        field: change.field,
        beforeCount: Array.isArray(change.before) ? change.before.length : 0,
        afterCount: Array.isArray(change.after) ? change.after.length : 0,
      };
    }
    if (change.field === "totalGrossMinor") {
      const before = scalar(change.before);
      const after = scalar(change.after);
      return before !== undefined && after !== undefined
        ? { kind: "money", field: change.field, beforeMinor: before ?? "0", afterMinor: after ?? "0" }
        : { kind: "unknown", field: change.field };
    }
    const before = scalar(change.before);
    const after = scalar(change.after);
    return before !== undefined && after !== undefined
      ? { kind: "value", field: change.field, before, after }
      : { kind: "unknown", field: change.field };
  });
}

function optionalStatus(value: string | null) {
  if (value === null) return null;
  if (!isOrderStatus(value)) throw new OrderError("INVALID_INPUT");
  return value;
}

function optionalPaymentStatus(value: string | null) {
  if (value === null) return null;
  if (!isOrderPaymentStatus(value)) throw new OrderError("INVALID_INPUT");
  return value;
}

function mapRevision(aggregate: Aggregate, revision: Aggregate["revisions"][number]) {
  if (
    !isCatalogLocale(revision.locale) ||
    !isOrderPaymentMethod(revision.paymentMethod) ||
    (revision.revisionKind !== "customer_submission" &&
      revision.revisionKind !== "administrator_edit")
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  const revisionItems = aggregate.items.filter(({ revisionId }) => revisionId === revision.id);
  const revisionAdjustments = aggregate.adjustments.filter(
    ({ revisionId }) => revisionId === revision.id,
  );
  const actorEvent = aggregate.events.find(
    (event) =>
      event.eventType === "content_revised" &&
      event.toRevisionNumber === revision.revisionNumber,
  );
  const actor: ManagedOrderActor =
    revision.revisionNumber === 1
      ? { kind: "guest" }
      : actorEvent
        ? auditActor(actorEvent)
        : (() => {
            throw new OrderError("INVALID_INPUT");
          })();
  const mapAdjustment = (
    adjustment: Aggregate["adjustments"][number],
  ): ManagedOrderAdjustment => ({
    adjustmentKey: adjustment.adjustmentKey,
    amountGrossMinor: adjustment.amountGrossMinor.toString(),
    reason: adjustment.reason,
    actor: administratorActor(adjustment),
  });
  return {
    revisionNumber: revision.revisionNumber,
    revisionKind: revision.revisionKind,
    locale: revision.locale,
    customer: {
      name: revision.customerName,
      phone: revision.customerPhone,
      email: revision.customerEmail,
      city: revision.city,
      deliveryAddress: revision.deliveryAddress,
      note: revision.customerNote,
    },
    paymentMethod: revision.paymentMethod,
    items: revisionItems.map((item) => {
      if (!isCatalogLocale(item.titleLocale)) throw new OrderError("INVALID_INPUT");
      return {
        lineKey: item.lineKey,
        productId: item.sourceProductId,
        sku: item.sku,
        title: item.localizedTitle,
        titleLocale: item.titleLocale,
        quantity: item.quantity,
        vatRateBasisPoints: item.vatRateBasisPoints,
        catalogUnitGrossMinor: item.catalogUnitGrossMinor.toString(),
        promotionUnitDiscountGrossMinor: item.promotionUnitDiscountGrossMinor.toString(),
        promotionLabel: item.promotionPublicLabel,
        promotionInternalName: item.promotionInternalName,
        effectiveCatalogUnitGrossMinor: item.effectiveCatalogUnitGrossMinor.toString(),
        manualUnitAdjustmentGrossMinor: item.manualUnitAdjustmentGrossMinor.toString(),
        finalUnitNetMinor: item.finalUnitNetMinor.toString(),
        finalUnitVatMinor: item.finalUnitVatMinor.toString(),
        finalUnitGrossMinor: item.finalUnitGrossMinor.toString(),
        lineNetMinor: item.lineNetMinor.toString(),
        lineVatMinor: item.lineVatMinor.toString(),
        lineGrossMinor: item.lineGrossMinor.toString(),
        adjustments: revisionAdjustments
          .filter(({ itemSnapshotId }) => itemSnapshotId === item.id)
          .map(mapAdjustment),
      };
    }),
    orderAdjustments: revisionAdjustments
      .filter(({ itemSnapshotId }) => itemSnapshotId === null)
      .map(mapAdjustment),
    totals: {
      catalogSubtotalGrossMinor: revision.catalogSubtotalGrossMinor.toString(),
      promotionDiscountGrossMinor: revision.promotionDiscountGrossMinor.toString(),
      itemAdjustmentGrossMinor: revision.itemAdjustmentGrossMinor.toString(),
      itemsNetMinor: revision.itemsNetMinor.toString(),
      itemsVatMinor: revision.itemsVatMinor.toString(),
      itemsGrossMinor: revision.itemsGrossMinor.toString(),
      orderAdjustmentNetMinor: revision.orderAdjustmentNetMinor.toString(),
      orderAdjustmentVatMinor: revision.orderAdjustmentVatMinor.toString(),
      orderAdjustmentGrossMinor: revision.orderAdjustmentGrossMinor.toString(),
      totalNetMinor: revision.totalNetMinor.toString(),
      totalVatMinor: revision.totalVatMinor.toString(),
      totalGrossMinor: revision.totalGrossMinor.toString(),
    },
    actor,
    createdAt: revision.createdAt.toISOString(),
  } satisfies ManagedOrderRevision;
}

export async function getManagedOrderDetail(
  actorId: string,
  orderId: string,
): Promise<ManagedOrderDetail> {
  return db.transaction(async (transaction) => {
    await getOrderActor(transaction, actorId, "order:view");
    const aggregate = await loadOrderHistoryAggregate(transaction, orderId);
    const { order } = aggregate;
    if (!isOrderStatus(order.status) || !isOrderPaymentStatus(order.paymentStatus)) {
      throw new OrderError("INVALID_INPUT");
    }
    const revisions = aggregate.revisions.map((revision) => mapRevision(aggregate, revision));
    const originalRevision = revisions.find(({ revisionNumber }) => revisionNumber === 1);
    const currentRevision = revisions.find(
      ({ revisionNumber }) => revisionNumber === order.currentRevisionNumber,
    );
    if (!originalRevision || !currentRevision) throw new OrderError("NOT_FOUND");
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      mutationVersion: order.mutationVersion,
      currentRevisionNumber: order.currentRevisionNumber,
      submittedAt: order.submittedAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      approvedAt: order.approvedAt?.toISOString() ?? null,
      rejectedAt: order.rejectedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      paymentStatusUpdatedAt: order.paymentStatusUpdatedAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      refundedAt: order.refundedAt?.toISOString() ?? null,
      originalRevision,
      currentRevision,
      revisions,
      auditEvents: aggregate.events.map((event) => {
        if (![
          "submitted",
          "content_revised",
          "order_status_changed",
          "payment_status_changed",
        ].includes(event.eventType)) throw new OrderError("INVALID_INPUT");
        return {
          id: event.id,
          eventType: event.eventType as ManagedOrderDetail["auditEvents"][number]["eventType"],
          mutationVersion: event.mutationVersion,
          fromRevisionNumber: event.fromRevisionNumber,
          toRevisionNumber: event.toRevisionNumber,
          fromOrderStatus: optionalStatus(event.fromOrderStatus),
          toOrderStatus: optionalStatus(event.toOrderStatus),
          fromPaymentStatus: optionalPaymentStatus(event.fromPaymentStatus),
          toPaymentStatus: optionalPaymentStatus(event.toPaymentStatus),
          changes: auditChanges(event.changes),
          actor: auditActor(event),
          occurredAt: event.occurredAt.toISOString(),
        };
      }),
      emailDeliveries: aggregate.notifications.map((notification) => {
        if (
          !isOrderNotificationKind(notification.notificationKind) ||
          !isOrderNotificationStatus(notification.status) ||
          (notification.lastErrorCode !== null &&
            !isOrderNotificationErrorCode(notification.lastErrorCode)) ||
          (notification.failureDisposition !== null &&
            notification.failureDisposition !== "permanent" &&
            notification.failureDisposition !== "retry_exhausted") ||
          (notification.recipientType !== "customer" &&
            notification.recipientType !== "internal")
        ) {
          throw new OrderError("INVALID_INPUT");
        }
        const recipientName =
          notification.recipientType === "customer"
            ? notification.customerRecipientName
            : notification.internalRecipientName;
        const recipientEmail =
          notification.recipientType === "customer"
            ? notification.customerRecipientEmail
            : notification.internalRecipientEmail;
        if (!recipientName || !recipientEmail) {
          throw new OrderError("INVALID_INPUT");
        }
        return {
          id: notification.id,
          notificationKind: notification.notificationKind,
          recipientType: notification.recipientType,
          recipientName,
          recipientEmail,
          templateVersion: notification.templateVersion,
          revisionNumber: notification.revisionNumber,
          status: notification.status,
          attemptCount: notification.attemptCount,
          manualRetryCount: notification.manualRetryCount,
          mutationVersion: notification.mutationVersion,
          lastErrorCode: notification.lastErrorCode,
          failureDisposition: notification.failureDisposition,
          canRetry:
            notification.status === "failed" &&
            notification.failureDisposition === "retry_exhausted",
          createdAt: notification.createdAt.toISOString(),
          lastAttemptAt: notification.lastAttemptAt?.toISOString() ?? null,
          nextAttemptAt: notification.nextAttemptAt?.toISOString() ?? null,
          sentAt: notification.sentAt?.toISOString() ?? null,
          failedAt: notification.failedAt?.toISOString() ?? null,
        };
      }),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
