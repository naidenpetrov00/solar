import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductTranslation,
} from "@/db/schema";
import {
  catalogCategoryStatus,
  catalogSalesMode,
  catalogAvailability,
} from "@/lib/catalog/management-access";
import type { CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogProductWorkspace } from "@/lib/catalog/management-product-types";

export async function getManagedProductsForCategory(
  categoryId: string,
  locale: CatalogLocale,
): Promise<ManagedCatalogProductWorkspace["products"]> {
  const [primaryRows, additionalRows] = await Promise.all([
    db
      .select({ id: catalogProduct.id })
      .from(catalogProduct)
      .where(eq(catalogProduct.primaryCategoryId, categoryId)),
    db
      .select({ id: catalogProductAdditionalCategory.productId })
      .from(catalogProductAdditionalCategory)
      .where(eq(catalogProductAdditionalCategory.categoryId, categoryId)),
  ]);
  const productIds = [
    ...new Set([
      ...primaryRows.map(({ id }) => id),
      ...additionalRows.map(({ id }) => id),
    ]),
  ];
  const [productRows, titleRows] = productIds.length
    ? await Promise.all([
        db
          .select()
          .from(catalogProduct)
          .where(inArray(catalogProduct.id, productIds)),
        db
          .select({
            productId: catalogProductTranslation.productId,
            locale: catalogProductTranslation.locale,
            title: catalogProductTranslation.title,
          })
          .from(catalogProductTranslation)
          .where(
            and(
              inArray(catalogProductTranslation.productId, productIds),
              or(
                eq(catalogProductTranslation.locale, locale),
                eq(catalogProductTranslation.locale, "bg"),
              ),
            ),
          ),
      ])
    : [[], []];
  const titleByProduct = new Map<string, string>();
  for (const productId of productIds) {
    const localized = titleRows.find(
      (translation) =>
        translation.productId === productId &&
        translation.locale === locale &&
        translation.title.trim(),
    );
    const bulgarian = titleRows.find(
      (translation) =>
        translation.productId === productId &&
        translation.locale === "bg" &&
        translation.title.trim(),
    );
    titleByProduct.set(productId, localized?.title ?? bulgarian?.title ?? "");
  }
  const products = productRows
    .map((product) => ({
      id: product.id,
      title: titleByProduct.get(product.id) ?? "",
      sku: product.sku,
      status: catalogCategoryStatus(product.status),
      salesMode: catalogSalesMode(product.salesMode),
      availability: catalogAvailability(product.availability),
      updatedAt: product.updatedAt.toISOString(),
    }))
    .toSorted(
      (left, right) =>
        left.title.localeCompare(right.title, locale) ||
        left.id.localeCompare(right.id),
    );

  return products;
}
