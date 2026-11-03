import "server-only";

import { db } from "@/db";
import { loadCategoryIndex } from "@/lib/catalog/public-category-index";
import { publicProductSummary } from "@/lib/catalog/public-product-list";
import { loadProductIndex } from "@/lib/catalog/public-product-index";
import { loadPublicPromotionPricing } from "@/lib/catalog/public-promotion-pricing";
import { isCatalogLocale, isUuid } from "@/lib/catalog/model";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { OrderError } from "@/lib/orders/errors";
import {
  managedOrderProductSearchLimit,
  type EligibleOrderProduct,
} from "@/lib/orders/management-model";
import { loadOrderAggregate } from "@/lib/orders/order-repository";
import { normalizeOrderSearchText } from "@/lib/orders/validation";

export async function searchEligibleOrderProducts(
  actorId: string,
  orderId: string,
  rawQuery: string,
  excludedIds: string[],
): Promise<EligibleOrderProduct[]> {
  if (
    !isUuid(orderId) ||
    rawQuery.length > 100 ||
    excludedIds.length > 50 ||
    excludedIds.some((id) => !isUuid(id))
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  await getOrderActor(db, actorId, "order:manage");
  const aggregate = await loadOrderAggregate(db, orderId);
  if (aggregate.order.status !== "pending_approval") {
    throw new OrderError("ORDER_NOT_EDITABLE");
  }
  if (!isCatalogLocale(aggregate.revision.locale)) {
    throw new OrderError("INVALID_INPUT");
  }
  const locale = aggregate.revision.locale;
  const [productIndex, categoryIndex, pricing] = await Promise.all([
    loadProductIndex(),
    loadCategoryIndex(),
    loadPublicPromotionPricing(),
  ]);
  const excluded = new Set(excludedIds);
  const query = normalizeOrderSearchText(rawQuery.trim());
  return productIndex.rows
    .flatMap((row): EligibleOrderProduct[] => {
      if (
        excluded.has(row.id) ||
        row.salesMode !== "direct_purchase" ||
        row.availability !== "in_stock" ||
        row.pricePresentation !== "exact"
      ) {
        return [];
      }
      const summary = publicProductSummary(
        productIndex,
        categoryIndex,
        row,
        locale,
        pricing,
      );
      if (!summary?.price || summary.price.presentation !== "exact") return [];
      if (
        query &&
        !normalizeOrderSearchText(summary.title).includes(query) &&
        !normalizeOrderSearchText(row.sku).includes(query)
      ) {
        return [];
      }
      return [{
        id: row.id,
        sku: row.sku,
        title: summary.title,
        effectiveUnitGrossMinor: summary.price.effectiveVatInclusiveMinor,
        vatRateBasisPoints: summary.price.vatRateBasisPoints,
        promotionLabel: summary.price.promotion?.label ?? null,
      }];
    })
    .toSorted(
      (left, right) =>
        left.title.localeCompare(right.title, locale) ||
        left.sku.localeCompare(right.sku),
    )
    .slice(0, managedOrderProductSearchLimit);
}
