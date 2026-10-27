import { revalidatePath } from "next/cache";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidation";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import type { CatalogCategoryPublicationIssue } from "@/lib/catalog/management-category-types";
import { CatalogValidationError } from "@/lib/catalog/model";
import { AuthorizationError, hasPermission } from "@/lib/permission-policy";
import { requireUser } from "@/lib/authorization";
import {
  dashboardCatalogRouteSlug,
  localizedPath,
  supportedLocales,
} from "../../_lib/routes";
import type { SupportedLocale } from "../../_lib/routes";
import type { CatalogActionResult } from "./category-action-model";

export function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function stringValues(formData: FormData) {
  const values: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

export function actionLocale(formData: FormData) {
  const locale = stringValue(formData, "locale");
  return isSupportedLocale(locale) ? locale : null;
}

export function isValidTimestamp(value: string) {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

export function hasOnlyKeys(value: object, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}

export async function requireCatalogManager() {
  const actor = await requireUser();

  if (!hasPermission(actor.role, "catalog:manage")) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }

  return actor;
}

export function errorResult(
  error: unknown,
  values?: Record<string, string>,
  fieldErrors?: Record<string, string>,
): CatalogActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN", values, fieldErrors };
  }

  if (error instanceof CatalogManagementError) {
    const slugLocale =
      error.code === "SLUG_CONFLICT" &&
      typeof error.details === "object" &&
      error.details !== null &&
      "locale" in error.details &&
      (error.details.locale === "bg" || error.details.locale === "en")
        ? error.details.locale
        : null;
    return {
      status: "error",
      code: error.code,
      values,
      fieldErrors: slugLocale
        ? { ...fieldErrors, [`${slugLocale}Slug`]: "CONFLICT" }
        : fieldErrors,
      publicationIssues: Array.isArray(error.details)
        ? (error.details as CatalogCategoryPublicationIssue[])
        : undefined,
    };
  }

  if (error instanceof CatalogValidationError) {
    return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
  }

  return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
}

export function revalidateCatalog(locale: SupportedLocale) {
  revalidatePath(localizedPath(locale, dashboardCatalogRouteSlug));
  revalidatePublicCatalog();
}
