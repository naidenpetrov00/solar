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
export const catalogPricePresentations = ["exact", "from", "on_request"] as const;
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
export type CatalogPriceEntryBasis =
  (typeof catalogPriceEntryBases)[number];

export const CATALOG_VAT_RATE_BASIS_POINTS = 2000;
export const CATALOG_BRAND_MAX_LENGTH = 120;
export const CATALOG_SLUG_MAX_LENGTH = 120;
export const CATALOG_MPN_MAX_LENGTH = 100;
export const CATALOG_MEDIA_REFERENCE_MAX_LENGTH = 2048;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const slugTransliteration: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n",
  о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "",
  ю: "yu", я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g",
};

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

export type CatalogCategoryTranslationInput = {
  locale: CatalogLocale;
  name: string;
  introduction: string;
  detailedContent?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  productTitleGuidance?: string | null;
};

export type CatalogSpecificationTranslationInput = {
  locale: CatalogLocale;
  label: string;
};

export type CatalogSpecificationOptionInput = {
  code: string;
  displayOrder: number;
  translations: CatalogSpecificationTranslationInput[];
};

export type CatalogSpecificationInput = {
  key: string;
  valueType: CatalogSpecificationValueType;
  unit?: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  displayOrder: number;
  translations: CatalogSpecificationTranslationInput[];
  options: CatalogSpecificationOptionInput[];
};

export type CatalogProductTranslationInput = {
  locale: CatalogLocale;
  title: string;
  shortDescription: string;
  fullDescription: string;
  marketingLabel?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
};

export type CatalogPricedInput = {
  presentation: "exact" | "from";
  entryBasis: CatalogPriceEntryBasis;
  inputMinor: bigint;
};

export type CatalogPriceOnRequestInput = {
  presentation: "on_request";
  entryBasis: null;
  inputMinor: null;
};

export type CatalogPriceInput = CatalogPricedInput | CatalogPriceOnRequestInput;

export type CatalogProductSpecificationValueInput =
  | { specificationId: string; type: "text"; value: string }
  | { specificationId: string; type: "number"; value: string }
  | { specificationId: string; type: "boolean"; value: boolean }
  | { specificationId: string; type: "selection"; optionId: string };

export type CatalogProductCustomSpecificationValueInput =
  | { type: "text"; value: string }
  | { type: "number"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "selection"; optionId: string };

export type CatalogProductCustomSpecificationInput = {
  id: string;
  valueType: CatalogSpecificationValueType;
  unit?: string | null;
  displayOrder: number;
  translations: CatalogSpecificationTranslationInput[];
  options: Array<{
    id: string;
    displayOrder: number;
    translations: CatalogSpecificationTranslationInput[];
  }>;
  value: CatalogProductCustomSpecificationValueInput | null;
};

export type CatalogProductSpecificationConfigurationInput = {
  excludedSpecificationIds: string[];
  customSpecifications: CatalogProductCustomSpecificationInput[];
};

export type CatalogProductMediaInput = {
  reference: string;
  displayOrder: number;
  isPrimary: boolean;
  isSocialImage: boolean;
  translations: Array<{
    locale: CatalogLocale;
    altText: string;
  }>;
};

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

export function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function normalizeRequiredText(
  value: string,
  maximumLength: number,
) {
  const normalized = normalizeWhitespace(value);

  if (!normalized || Array.from(normalized).length > maximumLength) {
    throw new CatalogValidationError("INVALID_CONTENT");
  }

  return normalized;
}

export function normalizeOptionalText(
  value: string | null | undefined,
  maximumLength: number,
) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (Array.from(normalized).length > maximumLength) {
    throw new CatalogValidationError("INVALID_CONTENT");
  }

  return normalized;
}

export function normalizeLongText(
  value: string | null | undefined,
  maximumLength: number,
  required = false,
) {
  const normalized = value?.trim() ?? "";

  if ((required && !normalized) || Array.from(normalized).length > maximumLength) {
    throw new CatalogValidationError("INVALID_CONTENT");
  }

  return normalized || null;
}

export function validateSlug(value: string) {
  if (
    value.length < 1 ||
    value.length > CATALOG_SLUG_MAX_LENGTH ||
    !slugPattern.test(value)
  ) {
    throw new CatalogValidationError("INVALID_SLUG");
  }

  return value;
}

export function catalogSlugFromName(value: string) {
  const transliterated = Array.from(value.toLocaleLowerCase("bg"), (character) =>
    slugTransliteration[character] ?? character,
  ).join("");
  const slug = transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, CATALOG_SLUG_MAX_LENGTH)
    .replace(/-+$/gu, "");

  return validateSlug(slug);
}

export function validateStableKey(value: string) {
  if (value.length < 1 || value.length > 80 || !slugPattern.test(value)) {
    throw new CatalogValidationError("INVALID_IDENTIFIER");
  }

  return value;
}

export function normalizeBrand(value: string | null | undefined) {
  const brand = normalizeOptionalText(value, CATALOG_BRAND_MAX_LENGTH);

  if (brand !== null && !brand) {
    throw new CatalogValidationError("INVALID_BRAND");
  }

  return brand;
}

export function normalizeMpn(value: string | null | undefined) {
  const mpn = normalizeOptionalText(value, CATALOG_MPN_MAX_LENGTH);

  if (mpn !== null && !mpn) {
    throw new CatalogValidationError("INVALID_MPN");
  }

  return mpn;
}

export function normalizeGtin(value: string | null | undefined) {
  const gtin = value?.trim() ?? "";

  if (!gtin) {
    return null;
  }

  if (!/^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/u.test(gtin)) {
    throw new CatalogValidationError("INVALID_GTIN");
  }

  const digits = Array.from(gtin, Number);
  const suppliedCheckDigit = digits.pop();
  let sum = 0;

  for (let index = digits.length - 1, offset = 0; index >= 0; index--, offset++) {
    sum += digits[index] * (offset % 2 === 0 ? 3 : 1);
  }

  const expectedCheckDigit = (10 - (sum % 10)) % 10;

  if (suppliedCheckDigit !== expectedCheckDigit) {
    throw new CatalogValidationError("INVALID_GTIN");
  }

  return gtin;
}

export function validateNonNegativeInteger(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CatalogValidationError("INVALID_IDENTIFIER");
  }

  return value;
}

export function publicVatInclusiveMinor(price: CatalogPricedInput) {
  if (price.inputMinor <= BigInt(0)) {
    throw new CatalogValidationError("INVALID_PRICE");
  }

  return price.entryBasis === "vat_inclusive"
    ? price.inputMinor
    : (price.inputMinor * BigInt(120) + BigInt(50)) / BigInt(100);
}

export function priceCounterpartMinor(price: CatalogPricedInput) {
  if (price.inputMinor <= BigInt(0)) {
    throw new CatalogValidationError("INVALID_PRICE");
  }

  return price.entryBasis === "vat_inclusive"
    ? (price.inputMinor * BigInt(100) + BigInt(60)) / BigInt(120)
    : publicVatInclusiveMinor(price);
}

export function validateCommerceInput(input: {
  salesMode: CatalogSalesMode;
  availability: CatalogAvailability | null;
  price: CatalogPriceInput;
}) {
  if (input.salesMode === "direct_purchase") {
    if (
      input.price.presentation !== "exact" ||
      input.availability === null
    ) {
      throw new CatalogValidationError("INVALID_AVAILABILITY");
    }

    publicVatInclusiveMinor(input.price);
    return;
  }

  if (input.availability !== null) {
    throw new CatalogValidationError("INVALID_AVAILABILITY");
  }

  if (input.price.presentation !== "on_request") {
    publicVatInclusiveMinor(input.price);
  }
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
