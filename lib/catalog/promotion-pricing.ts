import type { CatalogLocale, CatalogPriceEntryBasis } from "./model";
import type { PromotionDiscountType, PromotionScope } from "./promotion-model";
import { isPromotionActive } from "./promotion-model";
import { priceCounterpartMinor, publicVatInclusiveMinor } from "./commerce";

export type ResolvablePromotion = {
  id: string;
  discountType: PromotionDiscountType;
  scope: PromotionScope;
  percentageBasisPoints: number | null;
  fixedVatInclusiveMinor: bigint | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  labels: Partial<Record<CatalogLocale, string>>;
  categoryIds: Set<string>;
  productIds: Set<string>;
};

export type ResolvedCatalogPrice = {
  originalVatInclusiveMinor: bigint;
  originalVatExclusiveMinor: bigint;
  effectiveVatInclusiveMinor: bigint;
  effectiveVatExclusiveMinor: bigint;
  promotion: null | {
    id: string;
    label: string | null;
    savingsBasisPoints: number | null;
  };
};

const specificity: Record<PromotionScope, number> = {
  catalog: 1,
  category: 2,
  product: 3,
};

function discountMinor(promotion: ResolvablePromotion, price: bigint) {
  if (promotion.discountType === "fixed_eur") {
    return promotion.fixedVatInclusiveMinor;
  }
  if (promotion.percentageBasisPoints === null) return null;
  return (
    price * BigInt(promotion.percentageBasisPoints) + BigInt(5000)
  ) / BigInt(10000);
}

function matchesScope(
  promotion: ResolvablePromotion,
  productId: string,
  categoryIds: Set<string>,
) {
  if (promotion.scope === "catalog") return true;
  if (promotion.scope === "product") return promotion.productIds.has(productId);
  return [...categoryIds].some((id) => promotion.categoryIds.has(id));
}

export function resolveCatalogPrice(input: {
  productId: string;
  salesMode: "direct_purchase" | "enquiry";
  presentation: "exact" | "from";
  entryBasis: CatalogPriceEntryBasis;
  inputMinor: bigint;
  categoryIds: Iterable<string>;
  locale: CatalogLocale;
  now: Date;
  promotions: ResolvablePromotion[];
}): ResolvedCatalogPrice {
  const originalVatInclusiveMinor = publicVatInclusiveMinor(input);
  const originalVatExclusiveMinor =
    input.entryBasis === "vat_exclusive"
      ? input.inputMinor
      : priceCounterpartMinor(input);
  const categoryIds = new Set(input.categoryIds);
  let winner: { promotion: ResolvablePromotion; effective: bigint } | null = null;

  if (input.salesMode === "direct_purchase") {
    for (const promotion of input.promotions) {
      if (
        !isPromotionActive(promotion, input.now) ||
        !matchesScope(promotion, input.productId, categoryIds)
      ) {
        continue;
      }
      const discount = discountMinor(promotion, originalVatInclusiveMinor);
      if (!discount || discount <= BigInt(0)) continue;
      const effective = originalVatInclusiveMinor - discount;
      if (effective <= BigInt(0)) continue;
      if (!winner || effective < winner.effective) {
        winner = { promotion, effective };
        continue;
      }
      if (effective !== winner.effective) continue;
      const scopeOrder =
        specificity[promotion.scope] - specificity[winner.promotion.scope];
      if (
        scopeOrder > 0 ||
        (scopeOrder === 0 &&
          (promotion.createdAt < winner.promotion.createdAt ||
            (promotion.createdAt.getTime() ===
              winner.promotion.createdAt.getTime() &&
              promotion.id.localeCompare(winner.promotion.id) < 0)))
      ) {
        winner = { promotion, effective };
      }
    }
  }

  const effectiveVatInclusiveMinor = winner?.effective ?? originalVatInclusiveMinor;
  const effectiveVatExclusiveMinor = winner
    ? priceCounterpartMinor({
        presentation: input.presentation,
        entryBasis: "vat_inclusive",
        inputMinor: effectiveVatInclusiveMinor,
      })
    : originalVatExclusiveMinor;
  const saved = originalVatInclusiveMinor - effectiveVatInclusiveMinor;
  const savingsBasisPoints = winner
    ? Number(
        (saved * BigInt(10000) + originalVatInclusiveMinor / BigInt(2)) /
          originalVatInclusiveMinor,
      ) || null
    : null;

  return {
    originalVatInclusiveMinor,
    originalVatExclusiveMinor,
    effectiveVatInclusiveMinor,
    effectiveVatExclusiveMinor,
    promotion: winner
      ? {
          id: winner.promotion.id,
          label: winner.promotion.labels[input.locale] ?? null,
          savingsBasisPoints,
        }
      : null,
  };
}
