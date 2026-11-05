import "server-only";

import { randomUUID } from "node:crypto";

import type { CatalogOrderItemSnapshot } from "@/lib/orders/catalog-snapshot";
import { OrderError } from "@/lib/orders/errors";
import {
  checkedAdd,
  checkedMinor,
  checkedMultiply,
  splitVatInclusiveMinor,
} from "@/lib/orders/money";
import type { OrderActor, ManualAdjustmentInput } from "@/lib/orders/types";

export type RevisionLineDraft = {
  lineKey?: string;
  snapshot: CatalogOrderItemSnapshot;
  quantity: number;
  adjustments: ManualAdjustmentInput[];
};

export function prepareRevisionCalculation(input: {
  lines: RevisionLineDraft[];
  orderAdjustments: ManualAdjustmentInput[];
  actor: OrderActor | null;
}) {
  let catalogSubtotalGrossMinor = BigInt(0);
  let promotionDiscountGrossMinor = BigInt(0);
  let itemAdjustmentGrossMinor = BigInt(0);
  let itemsNetMinor = BigInt(0);
  let itemsVatMinor = BigInt(0);
  let itemsGrossMinor = BigInt(0);
  const adjustments: Array<{
    id: string;
    adjustmentKey: string;
    scope: "item" | "order";
    itemSnapshotId: string | null;
    amountGrossMinor: bigint;
    reason: string;
  }> = [];
  const lines = input.lines.map((line, position) => {
    const id = randomUUID();
    const manualUnitAdjustmentGrossMinor = checkedAdd(
      ...line.adjustments.map(({ amountGrossMinor }) =>
        checkedMinor(amountGrossMinor),
      ),
    );
    const finalUnitGrossMinor = checkedAdd(
      line.snapshot.effectiveCatalogUnitGrossMinor,
      manualUnitAdjustmentGrossMinor,
    );
    if (finalUnitGrossMinor <= BigInt(0)) {
      throw new OrderError("INVALID_INPUT", { field: "adjustments" });
    }
    const { netMinor: finalUnitNetMinor, vatMinor: finalUnitVatMinor } =
      splitVatInclusiveMinor(
        finalUnitGrossMinor,
        line.snapshot.vatRateBasisPoints,
      );
    const lineNetMinor = checkedMultiply(finalUnitNetMinor, line.quantity);
    const lineVatMinor = checkedMultiply(finalUnitVatMinor, line.quantity);
    const lineGrossMinor = checkedMultiply(finalUnitGrossMinor, line.quantity);
    catalogSubtotalGrossMinor = checkedAdd(
      catalogSubtotalGrossMinor,
      checkedMultiply(line.snapshot.catalogUnitGrossMinor, line.quantity),
    );
    promotionDiscountGrossMinor = checkedAdd(
      promotionDiscountGrossMinor,
      checkedMultiply(
        line.snapshot.promotion?.unitDiscountGrossMinor ?? BigInt(0),
        line.quantity,
      ),
    );
    itemAdjustmentGrossMinor = checkedAdd(
      itemAdjustmentGrossMinor,
      checkedMultiply(manualUnitAdjustmentGrossMinor, line.quantity),
    );
    itemsNetMinor = checkedAdd(itemsNetMinor, lineNetMinor);
    itemsVatMinor = checkedAdd(itemsVatMinor, lineVatMinor);
    itemsGrossMinor = checkedAdd(itemsGrossMinor, lineGrossMinor);
    for (const adjustment of line.adjustments) {
      adjustments.push({
        id: randomUUID(),
        adjustmentKey: adjustment.adjustmentKey ?? randomUUID(),
        scope: "item",
        itemSnapshotId: id,
        amountGrossMinor: adjustment.amountGrossMinor,
        reason: adjustment.reason,
      });
    }
    return {
      id,
      lineKey: line.lineKey ?? randomUUID(),
      position,
      ...line.snapshot,
      quantity: line.quantity,
      manualUnitAdjustmentGrossMinor,
      finalUnitNetMinor,
      finalUnitVatMinor,
      finalUnitGrossMinor,
      lineNetMinor,
      lineVatMinor,
      lineGrossMinor,
    };
  });

  let orderAdjustmentNetMinor = BigInt(0);
  let orderAdjustmentVatMinor = BigInt(0);
  let orderAdjustmentGrossMinor = BigInt(0);
  for (const adjustment of input.orderAdjustments) {
    const amount = checkedMinor(adjustment.amountGrossMinor);
    const split = splitVatInclusiveMinor(amount, 2000);
    orderAdjustmentNetMinor = checkedAdd(orderAdjustmentNetMinor, split.netMinor);
    orderAdjustmentVatMinor = checkedAdd(orderAdjustmentVatMinor, split.vatMinor);
    orderAdjustmentGrossMinor = checkedAdd(orderAdjustmentGrossMinor, amount);
    adjustments.push({
      id: randomUUID(),
      adjustmentKey: adjustment.adjustmentKey ?? randomUUID(),
      scope: "order",
      itemSnapshotId: null,
      amountGrossMinor: amount,
      reason: adjustment.reason,
    });
  }
  if (adjustments.length > 0 && !input.actor) {
    throw new OrderError("FORBIDDEN");
  }
  const totalNetMinor = checkedAdd(itemsNetMinor, orderAdjustmentNetMinor);
  const totalVatMinor = checkedAdd(itemsVatMinor, orderAdjustmentVatMinor);
  const totalGrossMinor = checkedAdd(itemsGrossMinor, orderAdjustmentGrossMinor);
  if (
    !lines.length ||
    totalNetMinor <= BigInt(0) ||
    totalVatMinor < BigInt(0) ||
    totalGrossMinor <= BigInt(0)
  ) {
    throw new OrderError("INVALID_INPUT", { field: "totals" });
  }
  return {
    lines,
    adjustments,
    totals: {
      catalogSubtotalGrossMinor,
      promotionDiscountGrossMinor,
      itemAdjustmentGrossMinor,
      itemsNetMinor,
      itemsVatMinor,
      itemsGrossMinor,
      orderAdjustmentNetMinor,
      orderAdjustmentVatMinor,
      orderAdjustmentGrossMinor,
      totalNetMinor,
      totalVatMinor,
      totalGrossMinor,
    },
  };
}
