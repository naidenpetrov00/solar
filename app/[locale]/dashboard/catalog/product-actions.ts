"use server";

import { revalidatePath } from "next/cache";

import { revalidatePublicCatalog } from "@/lib/catalog/revalidation";
import {
  archiveCatalogProduct,
  publishCatalogProduct,
  restoreCatalogProduct,
  unpublishCatalogProduct,
} from "@/lib/catalog/management-product-publication";
import { createCatalogProduct } from "@/lib/catalog/management-product-create";
import { updateCatalogProduct } from "@/lib/catalog/management-product-update";
import { isUuid } from "@/lib/catalog/model";
import { validateSlug } from "@/lib/catalog/text-validation";
import { AuthorizationError, hasPermission } from "@/lib/permission-policy";
import { requireUser } from "@/lib/authorization";
import { dashboardCatalogRouteSlug, localizedPath } from "../../_lib/routes";
import type { SupportedLocale } from "../../_lib/routes";
import type { CatalogActionCode } from "./category-action-model";
import type { ProductActionResult } from "./product-action-model";
import {
  actionLocale,
  isValidTimestamp,
  parseCommerce,
  parseTranslations,
  stringValue,
  stringValues,
} from "./product-action-form";
import {
  parseSpecificationConfiguration,
  parseSpecificationValues,
} from "./product-action-specifications";
import { parseMedia } from "./product-action-media";
import { errorResult } from "./product-action-errors";

async function requireCatalogManager() {
  const actor = await requireUser();
  if (!hasPermission(actor.role, "catalog:manage"))
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  return actor;
}

function revalidateCatalog(locale: SupportedLocale) {
  revalidatePath(localizedPath(locale, dashboardCatalogRouteSlug));
  revalidatePublicCatalog();
}

export async function saveCatalogProductAction(
  _previous: ProductActionResult,
  formData: FormData,
): Promise<ProductActionResult> {
  const locale = actionLocale(formData);
  const values = stringValues(formData);
  const productId = stringValue(formData, "productId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const creating = !productId;
  const primaryCategoryId = stringValue(formData, "primaryCategoryId");
  const additionalCategoryIds = formData
    .getAll("additionalCategoryIds")
    .filter((value): value is string => typeof value === "string");
  const commerce = parseCommerce(formData);
  const translations = parseTranslations(formData);
  const specificationValues = parseSpecificationValues(
    stringValue(formData, "specificationValues"),
  );
  const specificationConfiguration = parseSpecificationConfiguration(
    stringValue(formData, "specificationConfiguration"),
  );
  const media = parseMedia(stringValue(formData, "media"));
  const fieldErrors = { ...commerce.fieldErrors };
  const bgTitle = translations.find(
    ({ locale: candidate }) => candidate === "bg",
  )?.title;
  if (!bgTitle?.trim()) fieldErrors["content.bg.title"] = "REQUIRED";
  if (!stringValue(formData, "mpn").trim()) fieldErrors.mpn = "REQUIRED";
  if (!isUuid(primaryCategoryId)) fieldErrors.primaryCategoryId = "REQUIRED";
  if (
    additionalCategoryIds.some((id) => !isUuid(id)) ||
    new Set(additionalCategoryIds).size !== additionalCategoryIds.length ||
    additionalCategoryIds.includes(primaryCategoryId)
  )
    fieldErrors.additionalCategoryIds = "INVALID";
  let bgSlug = "";
  let enSlug = "";
  let trSlug: string | null = null;
  let ukSlug: string | null = null;
  try {
    bgSlug = validateSlug(stringValue(formData, "bgSlug"));
  } catch {
    fieldErrors.bgSlug = "INVALID";
  }
  try {
    enSlug = validateSlug(stringValue(formData, "enSlug"));
  } catch {
    fieldErrors.enSlug = "INVALID";
  }
  const trSlugInput = stringValue(formData, "trSlug");
  if (trSlugInput) {
    try {
      trSlug = validateSlug(trSlugInput);
    } catch {
      fieldErrors.trSlug = "INVALID";
    }
  }
  const ukSlugInput = stringValue(formData, "ukSlug");
  if (ukSlugInput) {
    try {
      ukSlug = validateSlug(ukSlugInput);
    } catch {
      fieldErrors.ukSlug = "INVALID";
    }
  }
  if (!specificationValues || !specificationConfiguration)
    fieldErrors.specifications = "INVALID";
  if (!media) fieldErrors.media = "INVALID";
  if (
    !locale ||
    (!creating &&
      (!isUuid(productId) || !isValidTimestamp(expectedUpdatedAt))) ||
    Object.keys(fieldErrors).length > 0
  )
    return { status: "error", code: "INVALID_INPUT", values, fieldErrors };

  const input = {
    brand: stringValue(formData, "brand") || null,
    bgSlug,
    enSlug,
    trSlug,
    ukSlug,
    salesMode: commerce.salesMode,
    primaryCategoryId,
    additionalCategoryIds,
    availability: commerce.availability,
    mpn: stringValue(formData, "mpn"),
    price: commerce.price,
    translations,
    specificationValues: specificationValues!,
    specificationConfiguration: specificationConfiguration!,
    media: media!,
  };
  try {
    const actor = await requireCatalogManager();
    const saved = creating
      ? await createCatalogProduct({ actorId: actor.id, ...input })
      : await updateCatalogProduct({
          actorId: actor.id,
          productId,
          expectedUpdatedAt,
          ...input,
          discardSpecificationValues:
            stringValue(formData, "discardSpecificationValues") === "true",
        });
    revalidateCatalog(locale);
    return {
      status: "success",
      code: creating ? "CREATED" : "SAVED",
      targetId: saved.id,
      sku: saved.sku,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return errorResult(error, values, fieldErrors);
  }
}

export async function manageCatalogProductAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const locale = actionLocale(formData);
  const productId = stringValue(formData, "productId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const intent = stringValue(formData, "intent");
  if (!locale || !isUuid(productId) || !isValidTimestamp(expectedUpdatedAt))
    return { status: "error", code: "INVALID_INPUT" };
  try {
    const actor = await requireCatalogManager();
    const input = { actorId: actor.id, productId, expectedUpdatedAt };
    let code: CatalogActionCode;
    if (intent === "publish") {
      await publishCatalogProduct(input);
      code = "PUBLISHED";
    } else if (intent === "unpublish") {
      await unpublishCatalogProduct(input);
      code = "UNPUBLISHED";
    } else if (intent === "archive") {
      await archiveCatalogProduct(input);
      code = "ARCHIVED";
    } else if (intent === "restore") {
      await restoreCatalogProduct(input);
      code = "RESTORED";
    } else return { status: "error", code: "INVALID_INPUT" };
    revalidateCatalog(locale);
    return { status: "success", code, targetId: productId };
  } catch (error) {
    return errorResult(error);
  }
}
