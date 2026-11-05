import type { OrderAuditChange } from "@/db/schema";
import { auditChange, compactAuditChanges } from "@/lib/orders/audit";
import type { prepareRevisionCalculation } from "@/lib/orders/calculation";
import type { loadOrderRevisionAggregate } from "@/lib/orders/order-repository";

type Current = Awaited<ReturnType<typeof loadOrderRevisionAggregate>>;
type Calculation = ReturnType<typeof prepareRevisionCalculation>;

function itemSummary(item: Current["items"][number]) {
  return {
    lineKey: item.lineKey,
    productId: item.sourceProductId,
    sku: item.sku,
    title: item.localizedTitle,
    quantity: item.quantity,
    finalUnitGrossMinor: item.finalUnitGrossMinor,
    lineGrossMinor: item.lineGrossMinor,
  };
}

function currentAdjustmentSummary(current: Current) {
  const lineByItemId = new Map(
    current.items.map((item) => [item.id, item.lineKey]),
  );
  return current.adjustments
    .map((adjustment) => ({
      adjustmentKey: adjustment.adjustmentKey,
      scope: adjustment.scope,
      lineKey: adjustment.itemSnapshotId
        ? lineByItemId.get(adjustment.itemSnapshotId) ?? null
        : null,
      amountGrossMinor: adjustment.amountGrossMinor,
      reason: adjustment.reason,
    }))
    .toSorted((left, right) =>
      left.adjustmentKey.localeCompare(right.adjustmentKey),
    );
}

function nextAdjustmentSummary(calculation: Calculation) {
  const lineByItemId = new Map(
    calculation.lines.map((item) => [item.id, item.lineKey]),
  );
  return calculation.adjustments
    .map((adjustment) => ({
      adjustmentKey: adjustment.adjustmentKey,
      scope: adjustment.scope,
      lineKey: adjustment.itemSnapshotId
        ? lineByItemId.get(adjustment.itemSnapshotId) ?? null
        : null,
      amountGrossMinor: adjustment.amountGrossMinor,
      reason: adjustment.reason,
    }))
    .toSorted((left, right) =>
      left.adjustmentKey.localeCompare(right.adjustmentKey),
    );
}

export function buildRevisionChanges(
  current: Current,
  next: {
    locale: string;
    customer: {
      name: string;
      phone: string;
      email: string;
      city: string;
      deliveryAddress: string;
      note: string | null;
    };
    paymentMethod: string;
    calculation: Calculation;
  },
): OrderAuditChange[] {
  const revision = current.revision;
  return compactAuditChanges([
    auditChange("locale", revision.locale, next.locale),
    auditChange("customer.name", revision.customerName, next.customer.name),
    auditChange("customer.phone", revision.customerPhone, next.customer.phone),
    auditChange("customer.email", revision.customerEmail, next.customer.email),
    auditChange("customer.city", revision.city, next.customer.city),
    auditChange(
      "customer.deliveryAddress",
      revision.deliveryAddress,
      next.customer.deliveryAddress,
    ),
    auditChange("customer.note", revision.customerNote, next.customer.note),
    auditChange("paymentMethod", revision.paymentMethod, next.paymentMethod),
    auditChange(
      "items",
      current.items.map(itemSummary),
      next.calculation.lines.map((item) => ({
        lineKey: item.lineKey,
        productId: item.productId,
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        finalUnitGrossMinor: item.finalUnitGrossMinor,
        lineGrossMinor: item.lineGrossMinor,
      })),
    ),
    auditChange(
      "adjustments",
      currentAdjustmentSummary(current),
      nextAdjustmentSummary(next.calculation),
    ),
    auditChange(
      "totalGrossMinor",
      revision.totalGrossMinor,
      next.calculation.totals.totalGrossMinor,
    ),
  ]);
}
