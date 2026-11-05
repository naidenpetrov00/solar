import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  catalogCategory,
  catalogPromotion,
  catalogPromotionCategory,
  catalogPromotionProduct,
  catalogPromotionTranslation,
} from "@/db/schema";
import type { CatalogLocale } from "@/lib/catalog/model";
import type { ResolvablePromotion } from "@/lib/catalog/promotion-pricing";
import type {
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/catalog/promotion-model";
import type { OrderTransaction } from "@/lib/orders/repository-types";

type PromotionRow = typeof catalogPromotion.$inferSelect;

function expandCategoryTargets(targets: string[], children: Map<string, string[]>) {
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

export async function loadOrderPromotionContext(
  transaction: OrderTransaction,
  locale: CatalogLocale,
) {
  const rows = await transaction
    .select()
    .from(catalogPromotion)
    .where(eq(catalogPromotion.isActive, true))
    .for("share");
  if (!rows.length) {
    return {
      promotions: [] as ResolvablePromotion[],
      promotionById: new Map<string, PromotionRow>(),
    };
  }
  const ids = rows.map(({ id }) => id);
  const translations = await transaction
    .select()
    .from(catalogPromotionTranslation)
    .where(
      and(
        inArray(catalogPromotionTranslation.promotionId, ids),
        eq(catalogPromotionTranslation.locale, locale),
      ),
    );
  const categoryTargets = await transaction
    .select()
    .from(catalogPromotionCategory)
    .where(inArray(catalogPromotionCategory.promotionId, ids));
  const productTargets = await transaction
    .select()
    .from(catalogPromotionProduct)
    .where(inArray(catalogPromotionProduct.promotionId, ids));
  const categories = await transaction
    .select({ id: catalogCategory.id, parentId: catalogCategory.parentId })
    .from(catalogCategory)
    .for("share");
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const values = children.get(category.parentId) ?? [];
    values.push(category.id);
    children.set(category.parentId, values);
  }
  const categoryIds = new Map<string, string[]>();
  for (const target of categoryTargets) {
    const values = categoryIds.get(target.promotionId) ?? [];
    values.push(target.categoryId);
    categoryIds.set(target.promotionId, values);
  }
  const productIds = new Map<string, Set<string>>();
  for (const target of productTargets) {
    const values = productIds.get(target.promotionId) ?? new Set<string>();
    values.add(target.productId);
    productIds.set(target.promotionId, values);
  }
  const labels = new Map(
    translations.map((row) => [row.promotionId, row.publicLabel]),
  );
  return {
    promotionById: new Map(rows.map((row) => [row.id, row])),
    promotions: rows.map(
      (row): ResolvablePromotion => ({
        id: row.id,
        discountType: row.discountType as PromotionDiscountType,
        scope: row.scope as PromotionScope,
        percentageBasisPoints: row.percentageBasisPoints,
        fixedVatInclusiveMinor: row.fixedVatInclusiveMinor,
        isActive: row.isActive,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        createdAt: row.createdAt,
        labels: labels.get(row.id) ? { [locale]: labels.get(row.id)! } : {},
        categoryIds: expandCategoryTargets(
          categoryIds.get(row.id) ?? [],
          children,
        ),
        productIds: productIds.get(row.id) ?? new Set(),
      }),
    ),
  };
}
