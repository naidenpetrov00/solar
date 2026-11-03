import { euroMinorToInput } from "@/lib/orders/decimal-money";
import type {
  EligibleOrderProduct,
  ManagedOrderAdjustment,
  ManagedOrderRevision,
} from "@/lib/orders/management-model";
import type { OrderPaymentMethod } from "@/lib/orders/model";

export type AdjustmentDraft = {
  draftKey: string;
  adjustmentKey: string | null;
  direction: "discount" | "surcharge";
  amount: string;
  reason: string;
};

export type LineDraft = {
  draftKey: string;
  lineKey: string | null;
  productId: string;
  sku: string;
  title: string;
  quantity: string;
  vatRateBasisPoints: number;
  effectiveUnitGrossMinor: string;
  promotionLabel: string | null;
  adjustments: AdjustmentDraft[];
};

export type OrderEditorDraft = {
  customer: ManagedOrderRevision["customer"];
  paymentMethod: OrderPaymentMethod;
  lines: LineDraft[];
  orderAdjustments: AdjustmentDraft[];
};

function adjustmentDraft(adjustment: ManagedOrderAdjustment): AdjustmentDraft {
  return {
    draftKey: adjustment.adjustmentKey,
    adjustmentKey: adjustment.adjustmentKey,
    direction: BigInt(adjustment.amountGrossMinor) < BigInt(0) ? "discount" : "surcharge",
    amount: euroMinorToInput(adjustment.amountGrossMinor),
    reason: adjustment.reason,
  };
}

export function draftFromRevision(revision: ManagedOrderRevision): OrderEditorDraft {
  return {
    customer: { ...revision.customer },
    paymentMethod: revision.paymentMethod,
    lines: revision.items.map((item) => ({
      draftKey: item.lineKey,
      lineKey: item.lineKey,
      productId: item.productId,
      sku: item.sku,
      title: item.title,
      quantity: String(item.quantity),
      vatRateBasisPoints: item.vatRateBasisPoints,
      effectiveUnitGrossMinor: item.effectiveCatalogUnitGrossMinor,
      promotionLabel: item.promotionLabel,
      adjustments: item.adjustments.map(adjustmentDraft),
    })),
    orderAdjustments: revision.orderAdjustments.map(adjustmentDraft),
  };
}

export function newProductLine(product: EligibleOrderProduct): LineDraft {
  return {
    draftKey: crypto.randomUUID(),
    lineKey: null,
    productId: product.id,
    sku: product.sku,
    title: product.title,
    quantity: "1",
    vatRateBasisPoints: product.vatRateBasisPoints,
    effectiveUnitGrossMinor: product.effectiveUnitGrossMinor,
    promotionLabel: product.promotionLabel,
    adjustments: [],
  };
}

export function newAdjustment(): AdjustmentDraft {
  return {
    draftKey: crypto.randomUUID(),
    adjustmentKey: null,
    direction: "discount",
    amount: "",
    reason: "",
  };
}

export function revisionPayload(draft: OrderEditorDraft) {
  return JSON.stringify({
    customer: draft.customer,
    paymentMethod: draft.paymentMethod,
    lines: draft.lines.map((line) => ({
      ...(line.lineKey ? { lineKey: line.lineKey } : { productId: line.productId }),
      quantity: line.quantity,
      adjustments: line.adjustments.map(({ adjustmentKey, direction, amount, reason }) => ({
        ...(adjustmentKey ? { adjustmentKey } : {}),
        direction,
        amount,
        reason,
      })),
    })),
    orderAdjustments: draft.orderAdjustments.map(
      ({ adjustmentKey, direction, amount, reason }) => ({
        ...(adjustmentKey ? { adjustmentKey } : {}),
        direction,
        amount,
        reason,
      }),
    ),
  });
}
