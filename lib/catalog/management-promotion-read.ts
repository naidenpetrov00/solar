import "server-only";

import { asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogProduct,
  catalogProductTranslation,
  catalogPromotion,
  catalogPromotionCategory,
  catalogPromotionProduct,
  catalogPromotionTranslation,
} from "@/db/schema";
import { getCatalogActorRole } from "./actor-repository";
import { getManagedCatalogCategoryWorkspace } from "./management-category-workspace";
import { CatalogManagementError } from "./management-errors";
import type {
  ManagedPromotionDetail,
  ManagedPromotionSummary,
  ManagedPromotionWorkspace,
} from "./management-promotion-types";
import {
  catalogLocales,
  isCatalogLocale,
  type CatalogLocale,
  type CatalogSalesMode,
  type CatalogStatus,
} from "./model";
import { promotionStatus, type PromotionScope } from "./promotion-model";
import { hasPermission } from "@/lib/permission-policy";

function promotionValue(row: typeof catalogPromotion.$inferSelect) {
  return row.discountType === "percentage"
    ? String(row.percentageBasisPoints ?? "")
    : String(row.fixedVatInclusiveMinor ?? "");
}

export async function getManagedPromotionWorkspace(
  actorId: string,
  requestedLocale: string,
  selectedId?: string,
): Promise<ManagedPromotionWorkspace> {
  const role = await getCatalogActorRole(db, actorId);
  if (!hasPermission(role, "catalog:view")) {
    throw new CatalogManagementError("FORBIDDEN");
  }
  const locale: CatalogLocale = isCatalogLocale(requestedLocale)
    ? requestedLocale
    : "bg";
  const [rows, categories, products, productTranslations] = await Promise.all([
    db.select().from(catalogPromotion).orderBy(asc(catalogPromotion.internalName), asc(catalogPromotion.id)),
    getManagedCatalogCategoryWorkspace(actorId, locale),
    db.select().from(catalogProduct).orderBy(asc(catalogProduct.sku)),
    db
      .select()
      .from(catalogProductTranslation)
      .where(
        or(
          eq(catalogProductTranslation.locale, locale),
          eq(catalogProductTranslation.locale, "bg"),
        ),
      ),
  ]);
  const promotionIds = rows.map(({ id }) => id);
  const [translations, categoryTargets, productTargets] = promotionIds.length
    ? await Promise.all([
        db
          .select()
          .from(catalogPromotionTranslation)
          .where(inArray(catalogPromotionTranslation.promotionId, promotionIds)),
        db
          .select()
          .from(catalogPromotionCategory)
          .where(inArray(catalogPromotionCategory.promotionId, promotionIds)),
        db
          .select()
          .from(catalogPromotionProduct)
          .where(inArray(catalogPromotionProduct.promotionId, promotionIds)),
      ])
    : [[], [], []];
  const now = new Date();
  const summaries = rows.map((row): ManagedPromotionSummary => {
    const targetCount =
      row.scope === "category"
        ? categoryTargets.filter(({ promotionId }) => promotionId === row.id).length
        : row.scope === "product"
          ? productTargets.filter(({ promotionId }) => promotionId === row.id).length
          : 0;
    return {
      id: row.id,
      internalName: row.internalName,
      discountType: row.discountType as "percentage" | "fixed_eur",
      value: promotionValue(row),
      scope: row.scope as PromotionScope,
      targetCount,
      status: promotionStatus(row, now),
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
  const selectedRow = selectedId
    ? rows.find(({ id }) => id === selectedId)
    : undefined;
  if (selectedId && !selectedRow) throw new CatalogManagementError("NOT_FOUND");
  const selected: ManagedPromotionDetail | null = selectedRow
    ? {
        ...summaries.find(({ id }) => id === selectedRow.id)!,
        isActive: selectedRow.isActive,
        translations: catalogLocales.map((contentLocale) => ({
          locale: contentLocale,
          publicLabel:
            translations.find(
              (item) =>
                item.promotionId === selectedRow.id &&
                item.locale === contentLocale,
            )?.publicLabel ?? null,
        })),
        categoryIds: categoryTargets
          .filter(({ promotionId }) => promotionId === selectedRow.id)
          .map(({ categoryId }) => categoryId),
        productIds: productTargets
          .filter(({ promotionId }) => promotionId === selectedRow.id)
          .map(({ productId }) => productId),
      }
    : null;

  return {
    canManage: hasPermission(role, "catalog:manage"),
    promotions: summaries,
    selected,
    categories: categories.categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      status: category.status,
    })),
    products: products.map((product) => {
      const title =
        productTranslations.find(
          (item) => item.productId === product.id && item.locale === locale,
        )?.title ||
        productTranslations.find(
          (item) => item.productId === product.id && item.locale === "bg",
        )?.title ||
        product.sku;
      return {
        id: product.id,
        name: title,
        sku: product.sku,
        status: product.status as CatalogStatus,
        salesMode: product.salesMode as CatalogSalesMode,
      };
    }),
  };
}
