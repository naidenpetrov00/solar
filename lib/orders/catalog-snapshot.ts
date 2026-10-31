import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductTranslation,
} from "@/db/schema";
import type { CatalogLocale, CatalogPriceEntryBasis } from "@/lib/catalog/model";
import { resolveCatalogPrice } from "@/lib/catalog/promotion-pricing";
import type { PromotionDiscountType } from "@/lib/catalog/promotion-model";
import { loadOrderPromotionContext } from "@/lib/orders/catalog-promotion-context";
import { OrderError } from "@/lib/orders/errors";
import { assertPublicOrderEligibility } from "@/lib/orders/public-eligibility";
import type { OrderTransaction } from "@/lib/orders/repository-types";

export type CatalogOrderItemSnapshot = {
  productId: string;
  sku: string;
  title: string;
  locale: CatalogLocale;
  vatRateBasisPoints: number;
  catalogUnitNetMinor: bigint;
  catalogUnitGrossMinor: bigint;
  effectiveCatalogUnitNetMinor: bigint;
  effectiveCatalogUnitGrossMinor: bigint;
  promotion: null | {
    id: string;
    internalName: string;
    publicLabel: string | null;
    discountType: PromotionDiscountType;
    percentageBasisPoints: number | null;
    fixedGrossMinor: bigint | null;
    unitDiscountGrossMinor: bigint;
  };
};

export async function snapshotCatalogOrderItems(
  transaction: OrderTransaction,
  locale: CatalogLocale,
  productIds: string[],
  now: Date,
): Promise<Map<string, CatalogOrderItemSnapshot>> {
  if (!productIds.length) return new Map();
  const products = await transaction
    .select()
    .from(catalogProduct)
    .where(inArray(catalogProduct.id, productIds))
    .for("share");
  if (products.length !== new Set(productIds).size) {
    throw new OrderError("INVALID_INPUT", { field: "items" });
  }
  const productIdList = products.map(({ id }) => id);
  const translations = await transaction
    .select()
    .from(catalogProductTranslation)
    .where(
      and(
        inArray(catalogProductTranslation.productId, productIdList),
        eq(catalogProductTranslation.locale, locale),
      ),
    );
  const additionalCategories = await transaction
    .select()
    .from(catalogProductAdditionalCategory)
    .where(inArray(catalogProductAdditionalCategory.productId, productIdList));
  await assertPublicOrderEligibility(transaction, {
    products,
    translations,
    locale,
  });
  const { promotions, promotionById } = await loadOrderPromotionContext(
    transaction,
    locale,
  );
  const translationByProduct = new Map(
    translations.map((row) => [row.productId, row]),
  );
  const extraCategoryIds = new Map<string, string[]>();
  for (const row of additionalCategories) {
    const values = extraCategoryIds.get(row.productId) ?? [];
    values.push(row.categoryId);
    extraCategoryIds.set(row.productId, values);
  }

  const result = new Map<string, CatalogOrderItemSnapshot>();
  for (const product of products) {
    const translation = translationByProduct.get(product.id);
    if (
      product.status !== "published" ||
      product.salesMode !== "direct_purchase" ||
      product.availability !== "in_stock" ||
      product.pricePresentation !== "exact" ||
      !product.priceEntryBasis ||
      product.priceInputMinor === null ||
      !translation
    ) {
      throw new OrderError("INVALID_INPUT", {
        field: "items",
        productId: product.id,
      });
    }
    const resolved = resolveCatalogPrice({
      productId: product.id,
      salesMode: "direct_purchase",
      presentation: "exact",
      entryBasis: product.priceEntryBasis as CatalogPriceEntryBasis,
      inputMinor: product.priceInputMinor,
      categoryIds: [
        product.primaryCategoryId,
        ...(extraCategoryIds.get(product.id) ?? []),
      ],
      locale,
      now,
      promotions,
    });
    const promotionRow = resolved.promotion
      ? promotionById.get(resolved.promotion.id)
      : null;
    result.set(product.id, {
      productId: product.id,
      sku: product.sku,
      title: translation.title.trim(),
      locale,
      vatRateBasisPoints: product.vatRateBasisPoints,
      catalogUnitNetMinor: resolved.originalVatExclusiveMinor,
      catalogUnitGrossMinor: resolved.originalVatInclusiveMinor,
      effectiveCatalogUnitNetMinor: resolved.effectiveVatExclusiveMinor,
      effectiveCatalogUnitGrossMinor: resolved.effectiveVatInclusiveMinor,
      promotion:
        promotionRow && resolved.promotion
          ? {
              id: promotionRow.id,
              internalName: promotionRow.internalName,
              publicLabel: resolved.promotion.label,
              discountType: promotionRow.discountType as PromotionDiscountType,
              percentageBasisPoints: promotionRow.percentageBasisPoints,
              fixedGrossMinor: promotionRow.fixedVatInclusiveMinor,
              unitDiscountGrossMinor:
                resolved.originalVatInclusiveMinor -
                resolved.effectiveVatInclusiveMinor,
            }
          : null,
    });
  }
  return result;
}
