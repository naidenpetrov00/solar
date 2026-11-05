import type { PromotionDiscountType } from "@/lib/catalog/promotion-model";
import { isCatalogLocale } from "@/lib/catalog/model";
import type { CatalogOrderItemSnapshot } from "@/lib/orders/catalog-snapshot";
import { OrderError } from "@/lib/orders/errors";
import type { loadOrderRevisionAggregate } from "@/lib/orders/order-repository";

type StoredItem = Awaited<
  ReturnType<typeof loadOrderRevisionAggregate>
>["items"][number];

export function snapshotFromStoredItem(
  item: StoredItem,
): CatalogOrderItemSnapshot {
  if (!isCatalogLocale(item.titleLocale)) throw new OrderError("INVALID_INPUT");
  return {
    productId: item.sourceProductId,
    sku: item.sku,
    title: item.localizedTitle,
    locale: item.titleLocale,
    vatRateBasisPoints: item.vatRateBasisPoints,
    catalogUnitNetMinor: item.catalogUnitNetMinor,
    catalogUnitGrossMinor: item.catalogUnitGrossMinor,
    effectiveCatalogUnitNetMinor: item.effectiveCatalogUnitNetMinor,
    effectiveCatalogUnitGrossMinor: item.effectiveCatalogUnitGrossMinor,
    promotion: item.sourcePromotionId
      ? {
          id: item.sourcePromotionId,
          internalName: item.promotionInternalName!,
          publicLabel: item.promotionPublicLabel,
          discountType: item.promotionDiscountType as PromotionDiscountType,
          percentageBasisPoints: item.promotionPercentageBasisPoints,
          fixedGrossMinor: item.promotionFixedGrossMinor,
          unitDiscountGrossMinor: item.promotionUnitDiscountGrossMinor,
        }
      : null,
  };
}
