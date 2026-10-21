"use server";

import { revalidatePath } from "next/cache";

import {
  archiveCatalogProduct,
  CatalogManagementError,
  createCatalogProduct,
  publishCatalogProduct,
  restoreCatalogProduct,
  unpublishCatalogProduct,
  updateCatalogProduct,
  type CatalogProductPublicationIssue,
} from "@/lib/catalog/management";
import {
  catalogLocales,
  CatalogValidationError,
  isCatalogLocale,
  isUuid,
  validateSlug,
  type CatalogAvailability,
  type CatalogPriceInput,
  type CatalogProductMediaInput,
  type CatalogProductSpecificationConfigurationInput,
  type CatalogProductSpecificationValueInput,
  type CatalogProductTranslationInput,
  type CatalogSalesMode,
  type CatalogSpecificationTranslationInput,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import {
  AuthorizationError,
  hasPermission,
  requireUser,
} from "@/lib/authorization";
import {
  dashboardCatalogRouteSlug,
  localizedPath,
  supportedLocales,
  type SupportedLocale,
} from "../../_lib/routes";
import type { CatalogActionCode } from "./actions";

export type ProductActionResult = {
  status: "idle" | "success" | "error";
  code?: CatalogActionCode;
  targetId?: string;
  updatedAt?: string;
  sku?: string;
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  publicationIssues?: CatalogProductPublicationIssue[];
};

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function actionLocale(formData: FormData): SupportedLocale | null {
  const locale = stringValue(formData, "locale");
  return (supportedLocales as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : null;
}

function isValidTimestamp(value: string) {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function parseMinorUnits(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)) {
    return null;
  }
  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return minor > BigInt(0) ? minor : null;
}

function parseCommerce(formData: FormData) {
  const salesMode = stringValue(formData, "salesMode");
  const presentation = stringValue(formData, "pricePresentation");
  const entryBasis = stringValue(formData, "priceEntryBasis");
  const availability = stringValue(formData, "availability");
  const fieldErrors: Record<string, string> = {};
  if (salesMode !== "direct_purchase" && salesMode !== "enquiry") {
    fieldErrors.salesMode = "REQUIRED";
  }
  if (
    !["exact", "from", "on_request"].includes(presentation) ||
    (salesMode === "direct_purchase" && presentation !== "exact")
  ) {
    fieldErrors.pricePresentation = "INVALID";
  }
  if (
    salesMode === "direct_purchase" &&
    availability !== "in_stock" &&
    availability !== "out_of_stock"
  ) {
    fieldErrors.availability = "REQUIRED";
  }
  let price: CatalogPriceInput;
  if (salesMode === "enquiry" && presentation === "on_request") {
    price = { presentation: "on_request", entryBasis: null, inputMinor: null };
  } else {
    const inputMinor = parseMinorUnits(stringValue(formData, "price"));
    if (!inputMinor) fieldErrors.price = "INVALID";
    if (entryBasis !== "vat_inclusive" && entryBasis !== "vat_exclusive") {
      fieldErrors.priceEntryBasis = "REQUIRED";
    }
    price = {
      presentation: presentation === "from" ? "from" : "exact",
      entryBasis:
        entryBasis === "vat_exclusive" ? "vat_exclusive" : "vat_inclusive",
      inputMinor: inputMinor ?? BigInt(0),
    };
  }
  return {
    salesMode: (salesMode === "enquiry"
      ? "enquiry"
      : "direct_purchase") as CatalogSalesMode,
    availability:
      salesMode === "direct_purchase" &&
      (availability === "in_stock" || availability === "out_of_stock")
        ? (availability as CatalogAvailability)
        : null,
    price,
    fieldErrors,
  };
}

function parseTranslations(formData: FormData) {
  return catalogLocales.map((locale): CatalogProductTranslationInput => {
    const prefix = `content.${locale}`;
    return {
      locale,
      title: stringValue(formData, `${prefix}.title`),
      shortDescription: stringValue(formData, `${prefix}.shortDescription`),
      fullDescription: stringValue(formData, `${prefix}.fullDescription`),
      metaDescription: stringValue(formData, `${prefix}.metaDescription`) || null,
    };
  });
}

function parseSpecificationValues(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const values: CatalogProductSpecificationValueInput[] = [];
  for (const candidate of parsed) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("specificationId" in candidate) ||
      !isUuid(String(candidate.specificationId)) ||
      !("type" in candidate)
    ) return null;
    if (candidate.type === "text" || candidate.type === "number") {
      if (!("value" in candidate) || typeof candidate.value !== "string") return null;
      values.push({ specificationId: String(candidate.specificationId), type: candidate.type, value: candidate.value });
    } else if (candidate.type === "boolean") {
      if (!("value" in candidate) || typeof candidate.value !== "boolean") return null;
      values.push({ specificationId: String(candidate.specificationId), type: "boolean", value: candidate.value });
    } else if (candidate.type === "selection") {
      if (!("optionId" in candidate) || !isUuid(String(candidate.optionId))) return null;
      values.push({ specificationId: String(candidate.specificationId), type: "selection", optionId: String(candidate.optionId) });
    } else return null;
  }
  return values;
}

function parseTranslationsArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const translations: CatalogSpecificationTranslationInput[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "object" || candidate === null ||
      !("locale" in candidate) || !isCatalogLocale(candidate.locale) ||
      !("label" in candidate) || typeof candidate.label !== "string"
    ) return null;
    translations.push({ locale: candidate.locale, label: candidate.label });
  }
  return translations;
}

function parseSpecificationConfiguration(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" || parsed === null ||
    !("excludedSpecificationIds" in parsed) ||
    !Array.isArray(parsed.excludedSpecificationIds) ||
    !parsed.excludedSpecificationIds.every((candidate) => typeof candidate === "string" && isUuid(candidate)) ||
    !("customSpecifications" in parsed) || !Array.isArray(parsed.customSpecifications)
  ) return null;

  const customSpecifications: CatalogProductSpecificationConfigurationInput["customSpecifications"] = [];
  for (const [displayOrder, candidate] of parsed.customSpecifications.entries()) {
    if (
      typeof candidate !== "object" || candidate === null ||
      !("id" in candidate) || !isUuid(String(candidate.id)) ||
      !("valueType" in candidate) ||
      !["text", "number", "boolean", "selection"].includes(String(candidate.valueType)) ||
      !("translations" in candidate) || !("options" in candidate) || !Array.isArray(candidate.options)
    ) return null;
    const translations = parseTranslationsArray(candidate.translations);
    if (!translations) return null;
    const options: CatalogProductSpecificationConfigurationInput["customSpecifications"][number]["options"] = [];
    for (const [optionOrder, option] of candidate.options.entries()) {
      if (
        typeof option !== "object" || option === null ||
        !("id" in option) || !isUuid(String(option.id)) || !("translations" in option)
      ) return null;
      const optionTranslations = parseTranslationsArray(option.translations);
      if (!optionTranslations) return null;
      options.push({ id: String(option.id), displayOrder: optionOrder, translations: optionTranslations });
    }
    const valueType = String(candidate.valueType) as CatalogSpecificationValueType;
    const rawValue = "value" in candidate ? candidate.value : null;
    let specificationValue: CatalogProductSpecificationConfigurationInput["customSpecifications"][number]["value"] = null;
    if (rawValue !== null) {
      if (typeof rawValue !== "object" || !("type" in rawValue)) return null;
      if ((rawValue.type === "text" || rawValue.type === "number") && "value" in rawValue && typeof rawValue.value === "string") {
        specificationValue = { type: rawValue.type, value: rawValue.value };
      } else if (rawValue.type === "boolean" && "value" in rawValue && typeof rawValue.value === "boolean") {
        specificationValue = { type: "boolean", value: rawValue.value };
      } else if (rawValue.type === "selection" && "optionId" in rawValue && isUuid(String(rawValue.optionId))) {
        specificationValue = { type: "selection", optionId: String(rawValue.optionId) };
      } else return null;
    }
    customSpecifications.push({
      id: String(candidate.id), valueType,
      unit: "unit" in candidate && typeof candidate.unit === "string" ? candidate.unit : null,
      displayOrder, translations, options, value: specificationValue,
    });
  }
  return {
    excludedSpecificationIds: parsed.excludedSpecificationIds.map(String),
    customSpecifications,
  } satisfies CatalogProductSpecificationConfigurationInput;
}

function parseMedia(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const media: CatalogProductMediaInput[] = [];
  for (const [displayOrder, candidate] of parsed.entries()) {
    if (
      typeof candidate !== "object" || candidate === null ||
      !("reference" in candidate) || typeof candidate.reference !== "string" ||
      !("isPrimary" in candidate) || typeof candidate.isPrimary !== "boolean" ||
      !("isSocialImage" in candidate) || typeof candidate.isSocialImage !== "boolean" ||
      !("translations" in candidate) || typeof candidate.translations !== "object" || candidate.translations === null
    ) return null;
    const translations: CatalogProductMediaInput["translations"] = [];
    for (const locale of catalogLocales) {
      const altText = (candidate.translations as Record<string, unknown>)[locale];
      if (typeof altText !== "string") return null;
      if (altText.trim()) translations.push({ locale, altText });
    }
    media.push({ reference: candidate.reference, displayOrder, isPrimary: candidate.isPrimary, isSocialImage: candidate.isSocialImage, translations });
  }
  return media;
}

function productSlugConflictLocale(
  error: unknown,
): "bg" | "en" | "tr" | "uk" | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { constraint?: unknown; cause?: unknown };
  const constraint = typeof candidate.constraint === "string"
    ? candidate.constraint
    : typeof candidate.cause === "object" && candidate.cause !== null &&
        "constraint" in candidate.cause && typeof candidate.cause.constraint === "string"
      ? candidate.cause.constraint : "";
  if (constraint.includes("catalog_product_bg_slug_idx")) return "bg";
  if (constraint.includes("catalog_product_en_slug_idx")) return "en";
  if (constraint.includes("catalog_product_tr_effective_slug_idx")) return "tr";
  if (constraint.includes("catalog_product_uk_effective_slug_idx")) return "uk";
  return null;
}

function errorResult(error: unknown, values?: Record<string, string>, fieldErrors?: Record<string, string>): ProductActionResult {
  if (error instanceof AuthorizationError) return { status: "error", code: "FORBIDDEN", values, fieldErrors };
  const conflictLocale = productSlugConflictLocale(error);
  if (conflictLocale) return { status: "error", code: "SLUG_CONFLICT", values, fieldErrors: { ...fieldErrors, [`${conflictLocale}Slug`]: "CONFLICT" } };
  if (error instanceof CatalogManagementError) {
    return {
      status: "error", code: error.code, values, fieldErrors,
      publicationIssues: Array.isArray(error.details) ? error.details as CatalogProductPublicationIssue[] : undefined,
    };
  }
  if (error instanceof CatalogValidationError) return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
  return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
}

async function requireCatalogManager() {
  const actor = await requireUser();
  if (!hasPermission(actor.role, "catalog:manage")) throw new AuthorizationError("PERMISSION_DENIED", 403);
  return actor;
}

function revalidateCatalog(locale: SupportedLocale) {
  revalidatePath(localizedPath(locale, dashboardCatalogRouteSlug));
}

export async function saveCatalogProductAction(_previous: ProductActionResult, formData: FormData): Promise<ProductActionResult> {
  const locale = actionLocale(formData);
  const values = stringValues(formData);
  const productId = stringValue(formData, "productId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const creating = !productId;
  const primaryCategoryId = stringValue(formData, "primaryCategoryId");
  const additionalCategoryIds = formData.getAll("additionalCategoryIds").filter((value): value is string => typeof value === "string");
  const commerce = parseCommerce(formData);
  const translations = parseTranslations(formData);
  const specificationValues = parseSpecificationValues(stringValue(formData, "specificationValues"));
  const specificationConfiguration = parseSpecificationConfiguration(stringValue(formData, "specificationConfiguration"));
  const media = parseMedia(stringValue(formData, "media"));
  const fieldErrors = { ...commerce.fieldErrors };
  const bgTitle = translations.find(({ locale: candidate }) => candidate === "bg")?.title;
  if (!bgTitle?.trim()) fieldErrors["content.bg.title"] = "REQUIRED";
  if (!stringValue(formData, "mpn").trim()) fieldErrors.mpn = "REQUIRED";
  if (!isUuid(primaryCategoryId)) fieldErrors.primaryCategoryId = "REQUIRED";
  if (
    additionalCategoryIds.some((id) => !isUuid(id)) ||
    new Set(additionalCategoryIds).size !== additionalCategoryIds.length ||
    additionalCategoryIds.includes(primaryCategoryId)
  ) fieldErrors.additionalCategoryIds = "INVALID";
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
  if (!specificationValues || !specificationConfiguration) fieldErrors.specifications = "INVALID";
  if (!media) fieldErrors.media = "INVALID";
  if (
    !locale ||
    (!creating && (!isUuid(productId) || !isValidTimestamp(expectedUpdatedAt))) ||
    Object.keys(fieldErrors).length > 0
  ) return { status: "error", code: "INVALID_INPUT", values, fieldErrors };

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
          actorId: actor.id, productId, expectedUpdatedAt, ...input,
          discardSpecificationValues: stringValue(formData, "discardSpecificationValues") === "true",
        });
    revalidateCatalog(locale);
    return { status: "success", code: creating ? "CREATED" : "SAVED", targetId: saved.id, sku: saved.sku, updatedAt: saved.updatedAt };
  } catch (error) {
    return errorResult(error, values, fieldErrors);
  }
}

export async function manageCatalogProductAction(formData: FormData): Promise<ProductActionResult> {
  const locale = actionLocale(formData);
  const productId = stringValue(formData, "productId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const intent = stringValue(formData, "intent");
  if (!locale || !isUuid(productId) || !isValidTimestamp(expectedUpdatedAt)) return { status: "error", code: "INVALID_INPUT" };
  try {
    const actor = await requireCatalogManager();
    const input = { actorId: actor.id, productId, expectedUpdatedAt };
    let code: CatalogActionCode;
    if (intent === "publish") { await publishCatalogProduct(input); code = "PUBLISHED"; }
    else if (intent === "unpublish") { await unpublishCatalogProduct(input); code = "UNPUBLISHED"; }
    else if (intent === "archive") { await archiveCatalogProduct(input); code = "ARCHIVED"; }
    else if (intent === "restore") { await restoreCatalogProduct(input); code = "RESTORED"; }
    else return { status: "error", code: "INVALID_INPUT" };
    revalidateCatalog(locale);
    return { status: "success", code, targetId: productId };
  } catch (error) {
    return errorResult(error);
  }
}
