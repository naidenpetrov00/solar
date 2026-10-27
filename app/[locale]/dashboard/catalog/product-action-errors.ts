import { AuthorizationError } from "@/lib/permission-policy";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { CatalogValidationError } from "@/lib/catalog/model";
import type { CatalogProductPublicationIssue } from "@/lib/catalog/management-product-types";
import type { ProductActionResult } from "./product-action-model";

function productSlugConflictLocale(
  error: unknown,
): "bg" | "en" | "tr" | "uk" | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { constraint?: unknown; cause?: unknown };
  const constraint =
    typeof candidate.constraint === "string"
      ? candidate.constraint
      : typeof candidate.cause === "object" &&
          candidate.cause !== null &&
          "constraint" in candidate.cause &&
          typeof candidate.cause.constraint === "string"
        ? candidate.cause.constraint
        : "";
  if (constraint.includes("catalog_product_bg_slug_idx")) return "bg";
  if (constraint.includes("catalog_product_en_slug_idx")) return "en";
  if (constraint.includes("catalog_product_tr_effective_slug_idx")) return "tr";
  if (constraint.includes("catalog_product_uk_effective_slug_idx")) return "uk";
  return null;
}

export function errorResult(
  error: unknown,
  values?: Record<string, string>,
  fieldErrors?: Record<string, string>,
): ProductActionResult {
  if (error instanceof AuthorizationError)
    return { status: "error", code: "FORBIDDEN", values, fieldErrors };
  const conflictLocale = productSlugConflictLocale(error);
  if (conflictLocale)
    return {
      status: "error",
      code: "SLUG_CONFLICT",
      values,
      fieldErrors: { ...fieldErrors, [`${conflictLocale}Slug`]: "CONFLICT" },
    };
  if (error instanceof CatalogManagementError) {
    return {
      status: "error",
      code: error.code,
      values,
      fieldErrors,
      publicationIssues: Array.isArray(error.details)
        ? (error.details as CatalogProductPublicationIssue[])
        : undefined,
    };
  }
  if (error instanceof CatalogValidationError)
    return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
  return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
}
