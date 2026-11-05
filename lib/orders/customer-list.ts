import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderRevision } from "@/db/schema";
import { requireUser } from "@/lib/authorization";
import {
  customerOrdersMaximumPage,
  customerOrdersPageSize,
  type CustomerOrdersPage,
  type CustomerOrdersRawQuery,
} from "@/lib/orders/customer-model";
import { OrderError } from "@/lib/orders/errors";
import { isOrderPaymentStatus, isOrderStatus } from "@/lib/orders/model";

function requestedPage(raw: CustomerOrdersRawQuery) {
  if (Array.isArray(raw.page) || (raw.page !== undefined && !/^\d+$/u.test(raw.page))) {
    return 1;
  }
  const page = raw.page ? Number(raw.page) : 1;
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(page, customerOrdersMaximumPage);
}

export async function listCurrentCustomerOrders(
  rawQuery: CustomerOrdersRawQuery = {},
): Promise<CustomerOrdersPage> {
  const currentUser = await requireUser();
  const requested = requestedPage(rawQuery);
  return db.transaction(async (transaction) => {
    const owner = eq(salesOrder.customerUserId, currentUser.id);
    const currentRevision = and(
      eq(salesOrderRevision.orderId, salesOrder.id),
      eq(salesOrderRevision.revisionNumber, salesOrder.currentRevisionNumber),
    );
    const [{ value: total }] = await transaction
      .select({ value: count() })
      .from(salesOrder)
      .innerJoin(salesOrderRevision, currentRevision)
      .where(owner);
    const pageCount = Math.max(1, Math.ceil(total / customerOrdersPageSize));
    const page = Math.min(requested, pageCount);
    const rows = await transaction
      .select({
        id: salesOrder.id,
        orderNumber: salesOrder.orderNumber,
        submittedAt: salesOrder.submittedAt,
        updatedAt: salesOrder.updatedAt,
        status: salesOrder.status,
        paymentStatus: salesOrder.paymentStatus,
        currency: salesOrderRevision.currency,
        totalGrossMinor: salesOrderRevision.totalGrossMinor,
      })
      .from(salesOrder)
      .innerJoin(salesOrderRevision, currentRevision)
      .where(owner)
      .orderBy(desc(salesOrder.submittedAt), desc(salesOrder.orderNumberSequence))
      .limit(customerOrdersPageSize)
      .offset((page - 1) * customerOrdersPageSize);
    return {
      page,
      pageCount,
      total,
      orders: rows.map((row) => {
        if (
          !isOrderStatus(row.status) ||
          !isOrderPaymentStatus(row.paymentStatus) ||
          row.currency !== "EUR"
        ) {
          throw new OrderError("INVALID_INPUT");
        }
        return {
          id: row.id,
          orderNumber: row.orderNumber,
          submittedAt: row.submittedAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          orderStatus: row.status,
          paymentStatus: row.paymentStatus,
          currency: row.currency,
          totalGrossMinor: row.totalGrossMinor.toString(),
        };
      }),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
