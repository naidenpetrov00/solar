import "server-only";
import { db } from "@/db";
import { isCatalogLocale } from "@/lib/catalog/model";
import { getCatalogActorRole } from "@/lib/catalog/actor-repository";
import { getProductPublicationAggregate } from "@/lib/catalog/product-repository";
import { hasPermission } from "@/lib/permission-policy";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import type { ManagedCatalogProductWorkspace } from "@/lib/catalog/management-product-types";
import {
  assertIdentifier,
  catalogCategoryStatus,
  catalogSalesMode,
  catalogAvailability,
} from "@/lib/catalog/management-access";
import { getProductCategoryConfigurations } from "@/lib/catalog/management-product-configurations";
import { getManagedProductsForCategory } from "@/lib/catalog/management-product-list";
import { mapManagedProductDetail } from "@/lib/catalog/management-product-selection";

export async function getManagedCatalogProductWorkspace(
  actorId: string,
  requestedLocale: string,
  categoryId: string,
  requestedProductId?: string,
): Promise<ManagedCatalogProductWorkspace> {
  assertIdentifier(categoryId);
  const role = await getCatalogActorRole(db, actorId);

  if (!hasPermission(role, "catalog:view")) {
    throw new CatalogManagementError("FORBIDDEN");
  }

  const locale = isCatalogLocale(requestedLocale) ? requestedLocale : "bg";
  const [categoryConfigurations, products] = await Promise.all([
    getProductCategoryConfigurations(categoryId),
    getManagedProductsForCategory(categoryId, locale),
  ]);

  if (!requestedProductId) {
    return {
      products,
      selected: null,
      categoryConfigurations,
    };
  }
  assertIdentifier(requestedProductId);

  const aggregate = await getProductPublicationAggregate(
    db,
    requestedProductId,
  );
  if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
  const productCategoryConfiguration = categoryConfigurations.find(
    ({ categoryId: configuredCategoryId }) =>
      configuredCategoryId === aggregate.product.primaryCategoryId,
  );
  if (!productCategoryConfiguration) {
    throw new CatalogManagementError("NOT_FOUND");
  }
  const selectedLocalizedTitle = aggregate.translations.find(
    (translation) => translation.locale === locale && translation.title.trim(),
  )?.title;
  const selectedBulgarianTitle = aggregate.translations.find(
    (translation) => translation.locale === "bg" && translation.title.trim(),
  )?.title;
  const summary = products.find(({ id }) => id === requestedProductId) ?? {
    id: aggregate.product.id,
    title: selectedLocalizedTitle ?? selectedBulgarianTitle ?? "",
    sku: aggregate.product.sku,
    status: catalogCategoryStatus(aggregate.product.status),
    salesMode: catalogSalesMode(aggregate.product.salesMode),
    availability: catalogAvailability(aggregate.product.availability),
    updatedAt: aggregate.product.updatedAt.toISOString(),
  };

  return {
    products,
    selected: mapManagedProductDetail(
      aggregate,
      summary,
      productCategoryConfiguration,
    ),
    categoryConfigurations,
  };
}
