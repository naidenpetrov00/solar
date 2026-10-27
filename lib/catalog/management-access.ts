import "server-only";
import {
  catalogLocales,
  isUuid,
  type CatalogAvailability,
  type CatalogSalesMode,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import {
  getCatalogActorRole,
  type CatalogTransaction,
} from "@/lib/catalog/actor-repository";
import { hasPermission } from "@/lib/permission-policy";
import type { AppPermission } from "@/lib/permission-policy";
import { CatalogManagementError } from "@/lib/catalog/management-errors";

export function assertIdentifier(value: string) {
  if (!isUuid(value)) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}

export function assertFresh(actual: Date, expected: string) {
  if (
    !Number.isFinite(Date.parse(expected)) ||
    actual.toISOString() !== expected
  ) {
    throw new CatalogManagementError("STALE");
  }
}

export async function assertCatalogActor(
  transaction: CatalogTransaction,
  actorId: string,
  permission: AppPermission,
) {
  const role = await getCatalogActorRole(transaction, actorId, true);

  if (!hasPermission(role, permission)) {
    throw new CatalogManagementError("FORBIDDEN");
  }
}

export function catalogCategoryStatus(
  value: string,
): "draft" | "published" | "archived" {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  throw new CatalogManagementError("INVALID_INPUT");
}

export function catalogSalesMode(value: string): CatalogSalesMode {
  if (value !== "direct_purchase" && value !== "enquiry") {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  return value;
}

export function catalogAvailability(
  value: string | null,
): CatalogAvailability | null {
  if (value === null || value === "in_stock" || value === "out_of_stock") {
    return value;
  }

  throw new CatalogManagementError("INVALID_INPUT");
}

export function catalogSpecificationValueType(
  value: string,
): CatalogSpecificationValueType {
  if (
    value === "text" ||
    value === "number" ||
    value === "boolean" ||
    value === "selection"
  ) {
    return value;
  }

  throw new CatalogManagementError("INVALID_INPUT");
}

export function catalogHasEveryLocale(locales: string[]) {
  return catalogLocales.every((locale) => locales.includes(locale));
}
