import "server-only";

import { isCatalogLocale, isUuid } from "@/lib/catalog/model";
import { OrderError } from "@/lib/orders/errors";
import {
  isOrderPaymentMethod,
  maximumOrderItemQuantity,
  maximumOrderItems,
} from "@/lib/orders/model";
import type { ReviseOrderInput } from "@/lib/orders/types";
import {
  normalizeAdjustments,
  normalizeOrderCustomer,
} from "@/lib/orders/validation";

export function normalizeRevisionInput(input: ReviseOrderInput) {
  if (
    !isUuid(input.orderId) ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 1 ||
    !isCatalogLocale(input.locale) ||
    !isOrderPaymentMethod(input.paymentMethod) ||
    input.lines.length < 1 ||
    input.lines.length > maximumOrderItems
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  const lines = input.lines.map((line) => {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > maximumOrderItemQuantity ||
      ("lineKey" in line ? !isUuid(line.lineKey) : !isUuid(line.productId))
    ) {
      throw new OrderError("INVALID_INPUT");
    }
    return { ...line, adjustments: normalizeAdjustments(line.adjustments) };
  });
  const orderAdjustments = normalizeAdjustments(input.orderAdjustments);
  const adjustmentKeys = new Set<string>();
  for (const adjustment of [
    ...lines.flatMap(({ adjustments }) => adjustments),
    ...orderAdjustments,
  ]) {
    if (!adjustment.adjustmentKey) continue;
    if (adjustmentKeys.has(adjustment.adjustmentKey)) {
      throw new OrderError("INVALID_INPUT");
    }
    adjustmentKeys.add(adjustment.adjustmentKey);
  }
  return {
    customer: normalizeOrderCustomer(input.customer),
    lines,
    orderAdjustments,
  };
}
