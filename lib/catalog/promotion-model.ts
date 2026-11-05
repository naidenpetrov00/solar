import type { CatalogLocale } from "@/lib/catalog/model";

export const promotionDiscountTypes = ["percentage", "fixed_eur"] as const;
export const promotionScopes = ["catalog", "category", "product"] as const;

export type PromotionDiscountType =
  (typeof promotionDiscountTypes)[number];
export type PromotionScope = (typeof promotionScopes)[number];

export type PromotionTranslationInput = {
  locale: CatalogLocale;
  publicLabel: string | null;
};

export type PromotionValue =
  | {
      discountType: "percentage";
      percentageBasisPoints: number;
      fixedVatInclusiveMinor: null;
    }
  | {
      discountType: "fixed_eur";
      percentageBasisPoints: null;
      fixedVatInclusiveMinor: bigint;
    };

export type PromotionInput = PromotionValue & {
  internalName: string;
  scope: PromotionScope;
  categoryIds: string[];
  productIds: string[];
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  translations: PromotionTranslationInput[];
};

export function isPromotionScope(value: string): value is PromotionScope {
  return promotionScopes.some((scope) => scope === value);
}

export function promotionStatus(
  promotion: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now: Date,
): "inactive" | "scheduled" | "active" | "ended" {
  if (!promotion.isActive) return "inactive";
  if (promotion.startsAt && promotion.startsAt > now) return "scheduled";
  if (promotion.endsAt && promotion.endsAt <= now) return "ended";
  return "active";
}

export function isPromotionActive(
  promotion: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now: Date,
) {
  return promotionStatus(promotion, now) === "active";
}
