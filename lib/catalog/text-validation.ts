import {
  CATALOG_BRAND_MAX_LENGTH,
  CATALOG_MPN_MAX_LENGTH,
  CATALOG_SLUG_MAX_LENGTH,
  CatalogValidationError,
} from "@/lib/catalog/model";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const slugTransliteration: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "",
  ю: "yu",
  я: "ya",
  є: "ye",
  і: "i",
  ї: "yi",
  ґ: "g",
};

export function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function normalizeRequiredText(value: string, maximumLength: number) {
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

  if (
    (required && !normalized) ||
    Array.from(normalized).length > maximumLength
  ) {
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
  const transliterated = Array.from(
    value.toLocaleLowerCase("bg"),
    (character) => slugTransliteration[character] ?? character,
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

  for (
    let index = digits.length - 1, offset = 0;
    index >= 0;
    index--, offset++
  ) {
    sum += digits[index] * (offset % 2 === 0 ? 3 : 1);
  }

  const expectedCheckDigit = (10 - (sum % 10)) % 10;

  if (suppliedCheckDigit !== expectedCheckDigit) {
    throw new CatalogValidationError("INVALID_GTIN");
  }

  return gtin;
}
