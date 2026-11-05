import "server-only";

import {
  salesOrderItemSnapshot,
  salesOrderPriceAdjustment,
  salesOrderRevision,
} from "@/db/schema";
import type { prepareRevisionCalculation } from "@/lib/orders/calculation";
import { orderCalculationVersion } from "@/lib/orders/model";
import type { OrderTransaction } from "@/lib/orders/repository-types";
import type { OrderActor } from "@/lib/orders/types";
import type { normalizeOrderCustomer } from "@/lib/orders/validation";

type Calculation = ReturnType<typeof prepareRevisionCalculation>;
type Customer = ReturnType<typeof normalizeOrderCustomer>;

export async function persistOrderRevision(
  transaction: OrderTransaction,
  input: {
    orderId: string;
    revisionNumber: number;
    revisionKind: "customer_submission" | "administrator_edit";
    locale: string;
    customer: Customer;
    paymentMethod: string;
    calculation: Calculation;
    actor: OrderActor | null;
  },
) {
  const [revision] = await transaction
    .insert(salesOrderRevision)
    .values({
      orderId: input.orderId,
      revisionNumber: input.revisionNumber,
      revisionKind: input.revisionKind,
      locale: input.locale,
      customerName: input.customer.name,
      customerNameNormalized: input.customer.nameNormalized,
      customerPhone: input.customer.phone,
      customerPhoneNormalized: input.customer.phoneNormalized,
      customerEmail: input.customer.email,
      customerEmailNormalized: input.customer.emailNormalized,
      city: input.customer.city,
      cityNormalized: input.customer.cityNormalized,
      deliveryAddress: input.customer.deliveryAddress,
      deliveryAddressNormalized: input.customer.deliveryAddressNormalized,
      customerNote: input.customer.note,
      paymentMethod: input.paymentMethod,
      calculationVersion: orderCalculationVersion,
      ...input.calculation.totals,
      createdByUserId: input.actor?.id ?? null,
    })
    .returning({ id: salesOrderRevision.id });

  await transaction.insert(salesOrderItemSnapshot).values(
    input.calculation.lines.map((line) => ({
      id: line.id,
      revisionId: revision.id,
      lineKey: line.lineKey,
      position: line.position,
      sourceProductId: line.productId,
      sku: line.sku,
      localizedTitle: line.title,
      titleLocale: line.locale,
      quantity: line.quantity,
      currency: "EUR",
      vatRateBasisPoints: line.vatRateBasisPoints,
      catalogUnitNetMinor: line.catalogUnitNetMinor,
      catalogUnitGrossMinor: line.catalogUnitGrossMinor,
      sourcePromotionId: line.promotion?.id ?? null,
      promotionInternalName: line.promotion?.internalName ?? null,
      promotionPublicLabel: line.promotion?.publicLabel ?? null,
      promotionDiscountType: line.promotion?.discountType ?? null,
      promotionPercentageBasisPoints:
        line.promotion?.percentageBasisPoints ?? null,
      promotionFixedGrossMinor: line.promotion?.fixedGrossMinor ?? null,
      promotionUnitDiscountGrossMinor:
        line.promotion?.unitDiscountGrossMinor ?? BigInt(0),
      effectiveCatalogUnitNetMinor: line.effectiveCatalogUnitNetMinor,
      effectiveCatalogUnitGrossMinor: line.effectiveCatalogUnitGrossMinor,
      manualUnitAdjustmentGrossMinor: line.manualUnitAdjustmentGrossMinor,
      finalUnitNetMinor: line.finalUnitNetMinor,
      finalUnitVatMinor: line.finalUnitVatMinor,
      finalUnitGrossMinor: line.finalUnitGrossMinor,
      lineNetMinor: line.lineNetMinor,
      lineVatMinor: line.lineVatMinor,
      lineGrossMinor: line.lineGrossMinor,
    })),
  );
  if (input.calculation.adjustments.length) {
    if (!input.actor) throw new Error("Order adjustment actor is required.");
    await transaction.insert(salesOrderPriceAdjustment).values(
      input.calculation.adjustments.map((adjustment) => ({
        ...adjustment,
        revisionId: revision.id,
        createdByUserId: input.actor!.id,
        actorName: input.actor!.name,
        actorEmail: input.actor!.email,
        actorRole: input.actor!.role,
      })),
    );
  }
  return revision;
}
