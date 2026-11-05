import "server-only";

import { cache } from "react";
import { eq, inArray } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/db";
import {
  catalogCategory,
  catalogPromotion,
  catalogPromotionCategory,
  catalogPromotionProduct,
  catalogPromotionTranslation,
} from "@/db/schema";
import { isCatalogLocale, type CatalogLocale } from "./model";
import type { ResolvablePromotion } from "./promotion-pricing";
import type { PromotionDiscountType, PromotionScope } from "./promotion-model";

export type PublicPromotionPricingContext = {
  now: Date;
  promotions: ResolvablePromotion[];
  refreshAfterMs: number | null;
};

function expandCategoryTargets(
  targets: string[],
  children: Map<string, string[]>,
) {
  const expanded = new Set<string>();
  const pending = [...targets];
  while (pending.length) {
    const id = pending.shift();
    if (!id || expanded.has(id)) continue;
    expanded.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return expanded;
}

export const loadPublicPromotionPricing = cache(
  async (): Promise<PublicPromotionPricingContext> => {
    await connection();
    const now = new Date();
    const rows = await db
      .select()
      .from(catalogPromotion)
      .where(eq(catalogPromotion.isActive, true));
    if (!rows.length) return { now, promotions: [], refreshAfterMs: null };
    const ids = rows.map(({ id }) => id);
    const [translations, categoryTargets, productTargets, categories] =
      await Promise.all([
        db
          .select()
          .from(catalogPromotionTranslation)
          .where(inArray(catalogPromotionTranslation.promotionId, ids)),
        db
          .select()
          .from(catalogPromotionCategory)
          .where(inArray(catalogPromotionCategory.promotionId, ids)),
        db
          .select()
          .from(catalogPromotionProduct)
          .where(inArray(catalogPromotionProduct.promotionId, ids)),
        db.select({ id: catalogCategory.id, parentId: catalogCategory.parentId }).from(catalogCategory),
      ]);
    const children = new Map<string, string[]>();
    for (const category of categories) {
      if (!category.parentId) continue;
      const idsForParent = children.get(category.parentId) ?? [];
      idsForParent.push(category.id);
      children.set(category.parentId, idsForParent);
    }
    const labelsByPromotion = new Map<
      string,
      Partial<Record<CatalogLocale, string>>
    >();
    for (const translation of translations) {
      if (!translation.publicLabel || !isCatalogLocale(translation.locale)) {
        continue;
      }
      const labels = labelsByPromotion.get(translation.promotionId) ?? {};
      labels[translation.locale] = translation.publicLabel;
      labelsByPromotion.set(translation.promotionId, labels);
    }
    const categoriesByPromotion = new Map<string, string[]>();
    for (const target of categoryTargets) {
      const targetIds = categoriesByPromotion.get(target.promotionId) ?? [];
      targetIds.push(target.categoryId);
      categoriesByPromotion.set(target.promotionId, targetIds);
    }
    const productsByPromotion = new Map<string, Set<string>>();
    for (const target of productTargets) {
      const targetIds =
        productsByPromotion.get(target.promotionId) ?? new Set<string>();
      targetIds.add(target.productId);
      productsByPromotion.set(target.promotionId, targetIds);
    }
    const futureBoundaries = rows.flatMap((row) =>
      [row.startsAt, row.endsAt].filter(
        (date): date is Date => Boolean(date && date > now),
      ),
    );
    const nextBoundary = futureBoundaries.toSorted(
      (left, right) => left.getTime() - right.getTime(),
    )[0];

    return {
      now,
      refreshAfterMs: nextBoundary
        ? Math.min(
            Math.max(nextBoundary.getTime() - now.getTime() + 250, 250),
            2_147_000_000,
          )
        : null,
      promotions: rows.map((row): ResolvablePromotion => {
        return {
          id: row.id,
          discountType: row.discountType as PromotionDiscountType,
          scope: row.scope as PromotionScope,
          percentageBasisPoints: row.percentageBasisPoints,
          fixedVatInclusiveMinor: row.fixedVatInclusiveMinor,
          isActive: row.isActive,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          createdAt: row.createdAt,
          labels: labelsByPromotion.get(row.id) ?? {},
          categoryIds: expandCategoryTargets(
            categoriesByPromotion.get(row.id) ?? [],
            children,
          ),
          productIds: productsByPromotion.get(row.id) ?? new Set<string>(),
        };
      }),
    };
  },
);
