export const catalogLocales = ["bg", "en", "tr", "uk"] as const;
export const catalogStatuses = ["draft", "published", "archived"] as const;
export const catalogSpecificationValueTypes = [
  "text",
  "number",
  "boolean",
  "selection",
] as const;
export const catalogSalesModes = ["direct_purchase", "enquiry"] as const;
export const catalogAvailabilities = ["in_stock", "out_of_stock"] as const;
export const catalogPricePresentations = [
  "exact",
  "from",
  "on_request",
] as const;
export const catalogPriceEntryBases = [
  "vat_inclusive",
  "vat_exclusive",
] as const;

export type CatalogLocale = (typeof catalogLocales)[number];
export type CatalogStatus = (typeof catalogStatuses)[number];
export type CatalogSpecificationValueType =
  (typeof catalogSpecificationValueTypes)[number];
export type CatalogSalesMode = (typeof catalogSalesModes)[number];
export type CatalogAvailability = (typeof catalogAvailabilities)[number];
export type CatalogPricePresentation =
  (typeof catalogPricePresentations)[number];
export type CatalogPriceEntryBasis = (typeof catalogPriceEntryBases)[number];

export const CATALOG_VAT_RATE_BASIS_POINTS = 2000;
export const CATALOG_BRAND_MAX_LENGTH = 120;
export const CATALOG_SLUG_MAX_LENGTH = 120;
export const CATALOG_MPN_MAX_LENGTH = 100;
export const CATALOG_MEDIA_REFERENCE_MAX_LENGTH = 2048;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type CatalogValidationErrorCode =
  | "INVALID_AVAILABILITY"
  | "INVALID_BRAND"
  | "INVALID_CONTENT"
  | "INVALID_GTIN"
  | "INVALID_IDENTIFIER"
  | "INVALID_LOCALE"
  | "INVALID_MEDIA"
  | "INVALID_MPN"
  | "INVALID_PRICE"
  | "INVALID_SLUG"
  | "INVALID_SPECIFICATION_VALUE";

export class CatalogValidationError extends Error {
  constructor(readonly code: CatalogValidationErrorCode) {
    super(code);
    this.name = "CatalogValidationError";
  }
}

export function isCatalogLocale(value: unknown): value is CatalogLocale {
  return (
    typeof value === "string" &&
    (catalogLocales as readonly string[]).includes(value)
  );
}

export function catalogCategorySlugForLocale(
  slugs: { bgSlug: string; enSlug: string },
  locale: CatalogLocale,
) {
  return locale === "bg" ? slugs.bgSlug : slugs.enSlug;
}

export function catalogProductSlugForLocale(
  slugs: {
    bgSlug: string;
    enSlug: string;
    trSlug: string | null;
    ukSlug: string | null;
  },
  locale: CatalogLocale,
) {
  if (locale === "bg") return slugs.bgSlug;
  if (locale === "tr") return slugs.trSlug ?? slugs.enSlug;
  if (locale === "uk") return slugs.ukSlug ?? slugs.enSlug;
  return slugs.enSlug;
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function validateNonNegativeInteger(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CatalogValidationError("INVALID_IDENTIFIER");
  }

  return value;
}

export function assertUniqueLocales(values: Array<{ locale: CatalogLocale }>) {
  const locales = new Set<CatalogLocale>();

  for (const value of values) {
    if (!isCatalogLocale(value.locale) || locales.has(value.locale)) {
      throw new CatalogValidationError("INVALID_LOCALE");
    }

    locales.add(value.locale);
  }
}

export function hasAllCatalogLocales(values: Array<{ locale: string }>) {
  const locales = new Set(values.map(({ locale }) => locale));
  return catalogLocales.every((locale) => locales.has(locale));
}

export function normalizeMediaReference(value: string) {
  const reference = value.trim();

  if (
    !reference ||
    reference.length > CATALOG_MEDIA_REFERENCE_MAX_LENGTH ||
    (!reference.startsWith("/") && !reference.startsWith("https://"))
  ) {
    throw new CatalogValidationError("INVALID_MEDIA");
  }

  return reference;
}

export function validateDecimal(value: string) {
  if (!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/u.test(value)) {
    throw new CatalogValidationError("INVALID_SPECIFICATION_VALUE");
  }

  const [integerPart] = value.replace(/^-/, "").split(".");

  if (integerPart.length > 14) {
    throw new CatalogValidationError("INVALID_SPECIFICATION_VALUE");
  }

  return value;
}
