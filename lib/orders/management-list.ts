import "server-only";

import { and, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { salesOrder, salesOrderRevision } from "@/db/schema";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { OrderError } from "@/lib/orders/errors";
import {
  managedOrdersMaximumPage,
  managedOrdersPageSize,
  managedOrdersSearchMaximumLength,
  type ManagedOrdersPage,
  type ManagedOrdersQuery,
  type ManagedOrdersRawQuery,
} from "@/lib/orders/management-model";
import {
  isOrderPaymentStatus,
  isOrderStatus,
} from "@/lib/orders/model";
import {
  normalizeOrderPhoneSearch,
  normalizeOrderSearchText,
} from "@/lib/orders/validation";

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function validCalendarDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseManagedOrdersQuery(
  raw: ManagedOrdersRawQuery,
): ManagedOrdersQuery {
  const invalidFilters: string[] = [];
  const rawQuery = scalar(raw.q).trim().replace(/\s+/gu, " ");
  const query = rawQuery.slice(0, managedOrdersSearchMaximumLength);
  if (Array.isArray(raw.q) || rawQuery.length > managedOrdersSearchMaximumLength) {
    invalidFilters.push("q");
  }
  const rawStatus = scalar(raw.status);
  const status = isOrderStatus(rawStatus) ? rawStatus : null;
  if (Array.isArray(raw.status) || (rawStatus && !status)) invalidFilters.push("status");
  const rawPayment = scalar(raw.payment);
  const paymentStatus = isOrderPaymentStatus(rawPayment) ? rawPayment : null;
  if (Array.isArray(raw.payment) || (rawPayment && !paymentStatus)) {
    invalidFilters.push("payment");
  }
  let from = scalar(raw.from);
  let to = scalar(raw.to);
  if (Array.isArray(raw.from) || (from && !validCalendarDate(from))) {
    invalidFilters.push("from");
    from = "";
  }
  if (Array.isArray(raw.to) || (to && !validCalendarDate(to))) {
    invalidFilters.push("to");
    to = "";
  }
  if (from && to && from > to) {
    invalidFilters.push("dateRange");
    from = "";
    to = "";
  }
  const rawPage = scalar(raw.page);
  const requestedPage = rawPage ? Number(rawPage) : 1;
  const validPage = Number.isSafeInteger(requestedPage) && requestedPage >= 1;
  if (Array.isArray(raw.page) || !validPage || requestedPage > managedOrdersMaximumPage) {
    if (raw.page !== undefined) invalidFilters.push("page");
  }
  return {
    query,
    status,
    paymentStatus,
    from,
    to,
    page: validPage ? Math.min(requestedPage, managedOrdersMaximumPage) : 1,
    invalidFilters,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/gu, "\\$&");
}

export async function listManagedOrders(
  actorId: string,
  rawQuery: ManagedOrdersRawQuery,
): Promise<ManagedOrdersPage> {
  const parsed = parseManagedOrdersQuery(rawQuery);
  return db.transaction(async (transaction) => {
    await getOrderActor(transaction, actorId, "order:view");
    const predicates: SQL[] = [];
    if (parsed.query) {
      const normalized = normalizeOrderSearchText(parsed.query);
      const phone = normalizeOrderPhoneSearch(parsed.query);
      const pattern = `%${escapeLike(normalized)}%`;
      const searchPredicate = or(
          ilike(salesOrder.orderNumber, `%${escapeLike(parsed.query)}%`),
          ilike(salesOrderRevision.customerNameNormalized, pattern),
          ilike(salesOrderRevision.customerEmailNormalized, pattern),
          ...(phone
            ? [ilike(salesOrderRevision.customerPhoneNormalized, `%${escapeLike(phone)}%`)]
            : []),
        );
      if (searchPredicate) predicates.push(searchPredicate);
    }
    if (parsed.status) predicates.push(eq(salesOrder.status, parsed.status));
    if (parsed.paymentStatus) {
      predicates.push(eq(salesOrder.paymentStatus, parsed.paymentStatus));
    }
    if (parsed.from) {
      predicates.push(
        gte(
          salesOrder.submittedAt,
          sql`(${parsed.from}::date::timestamp AT TIME ZONE 'Europe/Sofia')`,
        ),
      );
    }
    if (parsed.to) {
      predicates.push(
        lt(
          salesOrder.submittedAt,
          sql`((${parsed.to}::date + 1)::timestamp AT TIME ZONE 'Europe/Sofia')`,
        ),
      );
    }
    const currentRevision = and(
      eq(salesOrderRevision.orderId, salesOrder.id),
      eq(salesOrderRevision.revisionNumber, salesOrder.currentRevisionNumber),
    );
    const where = predicates.length ? and(...predicates) : undefined;
    const [{ value: total }] = await transaction
      .select({ value: count() })
      .from(salesOrder)
      .innerJoin(salesOrderRevision, currentRevision)
      .where(where);
    const pageCount = Math.max(1, Math.ceil(total / managedOrdersPageSize));
    const page = Math.min(parsed.page, pageCount);
    const rows = await transaction
      .select({
        id: salesOrder.id,
        orderNumber: salesOrder.orderNumber,
        submittedAt: salesOrder.submittedAt,
        customerName: salesOrderRevision.customerName,
        customerPhone: salesOrderRevision.customerPhone,
        totalGrossMinor: salesOrderRevision.totalGrossMinor,
        status: salesOrder.status,
        paymentStatus: salesOrder.paymentStatus,
      })
      .from(salesOrder)
      .innerJoin(salesOrderRevision, currentRevision)
      .where(where)
      .orderBy(desc(salesOrder.submittedAt), desc(salesOrder.orderNumberSequence))
      .limit(managedOrdersPageSize)
      .offset((page - 1) * managedOrdersPageSize);
    return {
      ...parsed,
      page,
      total,
      pageCount,
      orders: rows.map((row) => {
        if (!isOrderStatus(row.status) || !isOrderPaymentStatus(row.paymentStatus)) {
          throw new OrderError("INVALID_INPUT");
        }
        return {
          id: row.id,
          orderNumber: row.orderNumber,
          submittedAt: row.submittedAt.toISOString(),
          customerName: row.customerName,
          customerPhone: row.customerPhone,
          totalGrossMinor: row.totalGrossMinor.toString(),
          orderStatus: row.status,
          paymentStatus: row.paymentStatus,
        };
      }),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
