import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  salesOrder,
  salesOrderItemSnapshot,
  salesOrderRevision,
} from "@/db/schema";
import { requireUser } from "@/lib/authorization";
import { isCatalogLocale, isUuid } from "@/lib/catalog/model";
import type { CustomerOrderDetail } from "@/lib/orders/customer-model";
import { OrderError } from "@/lib/orders/errors";
import {
  isOrderPaymentMethod,
  isOrderPaymentStatus,
  isOrderStatus,
} from "@/lib/orders/model";

export async function getCurrentCustomerOrderDetail(
  orderId: string,
): Promise<CustomerOrderDetail> {
  const currentUser = await requireUser();
  if (!isUuid(orderId)) throw new OrderError("NOT_FOUND");
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .select({
        id: salesOrder.id,
        orderNumber: salesOrder.orderNumber,
        status: salesOrder.status,
        paymentStatus: salesOrder.paymentStatus,
        submittedAt: salesOrder.submittedAt,
        updatedAt: salesOrder.updatedAt,
        approvedAt: salesOrder.approvedAt,
        rejectedAt: salesOrder.rejectedAt,
        cancelledAt: salesOrder.cancelledAt,
        completedAt: salesOrder.completedAt,
        paymentStatusUpdatedAt: salesOrder.paymentStatusUpdatedAt,
        paidAt: salesOrder.paidAt,
        refundedAt: salesOrder.refundedAt,
        revisionId: salesOrderRevision.id,
        locale: salesOrderRevision.locale,
        customerName: salesOrderRevision.customerName,
        customerPhone: salesOrderRevision.customerPhone,
        customerEmail: salesOrderRevision.customerEmail,
        city: salesOrderRevision.city,
        deliveryAddress: salesOrderRevision.deliveryAddress,
        customerNote: salesOrderRevision.customerNote,
        paymentMethod: salesOrderRevision.paymentMethod,
        currency: salesOrderRevision.currency,
        catalogSubtotalGrossMinor: salesOrderRevision.catalogSubtotalGrossMinor,
        promotionDiscountGrossMinor: salesOrderRevision.promotionDiscountGrossMinor,
        itemAdjustmentGrossMinor: salesOrderRevision.itemAdjustmentGrossMinor,
        itemsNetMinor: salesOrderRevision.itemsNetMinor,
        itemsVatMinor: salesOrderRevision.itemsVatMinor,
        itemsGrossMinor: salesOrderRevision.itemsGrossMinor,
        orderAdjustmentNetMinor: salesOrderRevision.orderAdjustmentNetMinor,
        orderAdjustmentVatMinor: salesOrderRevision.orderAdjustmentVatMinor,
        orderAdjustmentGrossMinor: salesOrderRevision.orderAdjustmentGrossMinor,
        totalNetMinor: salesOrderRevision.totalNetMinor,
        totalVatMinor: salesOrderRevision.totalVatMinor,
        totalGrossMinor: salesOrderRevision.totalGrossMinor,
      })
      .from(salesOrder)
      .innerJoin(
        salesOrderRevision,
        and(
          eq(salesOrderRevision.orderId, salesOrder.id),
          eq(salesOrderRevision.revisionNumber, salesOrder.currentRevisionNumber),
        ),
      )
      .where(
        and(
          eq(salesOrder.id, orderId),
          eq(salesOrder.customerUserId, currentUser.id),
        ),
      )
      .limit(1);
    if (!row) throw new OrderError("NOT_FOUND");
    if (
      !isOrderStatus(row.status) ||
      !isOrderPaymentStatus(row.paymentStatus) ||
      !isOrderPaymentMethod(row.paymentMethod) ||
      !isCatalogLocale(row.locale) ||
      row.currency !== "EUR"
    ) {
      throw new OrderError("INVALID_INPUT");
    }
    const items = await transaction
      .select({
        sku: salesOrderItemSnapshot.sku,
        title: salesOrderItemSnapshot.localizedTitle,
        titleLocale: salesOrderItemSnapshot.titleLocale,
        quantity: salesOrderItemSnapshot.quantity,
        vatRateBasisPoints: salesOrderItemSnapshot.vatRateBasisPoints,
        promotionLabel: salesOrderItemSnapshot.promotionPublicLabel,
        finalUnitNetMinor: salesOrderItemSnapshot.finalUnitNetMinor,
        finalUnitVatMinor: salesOrderItemSnapshot.finalUnitVatMinor,
        finalUnitGrossMinor: salesOrderItemSnapshot.finalUnitGrossMinor,
        lineNetMinor: salesOrderItemSnapshot.lineNetMinor,
        lineVatMinor: salesOrderItemSnapshot.lineVatMinor,
        lineGrossMinor: salesOrderItemSnapshot.lineGrossMinor,
      })
      .from(salesOrderItemSnapshot)
      .where(eq(salesOrderItemSnapshot.revisionId, row.revisionId))
      .orderBy(asc(salesOrderItemSnapshot.position));
    if (!items.length) throw new OrderError("INVALID_INPUT");
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentStatus: row.paymentStatus,
      submittedAt: row.submittedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      paymentStatusUpdatedAt: row.paymentStatusUpdatedAt.toISOString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      refundedAt: row.refundedAt?.toISOString() ?? null,
      locale: row.locale,
      customer: {
        name: row.customerName,
        phone: row.customerPhone,
        email: row.customerEmail,
        city: row.city,
        deliveryAddress: row.deliveryAddress,
        note: row.customerNote,
      },
      paymentMethod: row.paymentMethod,
      currency: row.currency,
      items: items.map((item) => {
        if (!isCatalogLocale(item.titleLocale)) {
          throw new OrderError("INVALID_INPUT");
        }
        return {
          ...item,
          titleLocale: item.titleLocale,
          finalUnitNetMinor: item.finalUnitNetMinor.toString(),
          finalUnitVatMinor: item.finalUnitVatMinor.toString(),
          finalUnitGrossMinor: item.finalUnitGrossMinor.toString(),
          lineNetMinor: item.lineNetMinor.toString(),
          lineVatMinor: item.lineVatMinor.toString(),
          lineGrossMinor: item.lineGrossMinor.toString(),
        };
      }),
      totals: {
        catalogSubtotalGrossMinor: row.catalogSubtotalGrossMinor.toString(),
        promotionDiscountGrossMinor: row.promotionDiscountGrossMinor.toString(),
        itemAdjustmentGrossMinor: row.itemAdjustmentGrossMinor.toString(),
        itemsNetMinor: row.itemsNetMinor.toString(),
        itemsVatMinor: row.itemsVatMinor.toString(),
        itemsGrossMinor: row.itemsGrossMinor.toString(),
        orderAdjustmentNetMinor: row.orderAdjustmentNetMinor.toString(),
        orderAdjustmentVatMinor: row.orderAdjustmentVatMinor.toString(),
        orderAdjustmentGrossMinor: row.orderAdjustmentGrossMinor.toString(),
        totalNetMinor: row.totalNetMinor.toString(),
        totalVatMinor: row.totalVatMinor.toString(),
        totalGrossMinor: row.totalGrossMinor.toString(),
      },
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
