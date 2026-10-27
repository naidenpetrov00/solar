import {
  catalogLocales,
  type CatalogAvailability,
  type CatalogSalesMode,
} from "@/lib/catalog/model";
import type {
  CatalogPriceInput,
  CatalogProductTranslationInput,
} from "@/lib/catalog/catalog-inputs";
import { supportedLocales } from "../../_lib/routes";
import type { SupportedLocale } from "../../_lib/routes";

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

export function actionLocale(formData: FormData): SupportedLocale | null {
  const locale = stringValue(formData, "locale");
  return (supportedLocales as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : null;
}

export function isValidTimestamp(value: string) {
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

export function parseCommerce(formData: FormData) {
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

export function parseTranslations(formData: FormData) {
  return catalogLocales.map((locale): CatalogProductTranslationInput => {
    const prefix = `content.${locale}`;
    return {
      locale,
      title: stringValue(formData, `${prefix}.title`),
      shortDescription: stringValue(formData, `${prefix}.shortDescription`),
      fullDescription: stringValue(formData, `${prefix}.fullDescription`),
      marketingLabel: stringValue(formData, `${prefix}.marketingLabel`) || null,
      seoTitle: stringValue(formData, `${prefix}.seoTitle`) || null,
      metaDescription:
        stringValue(formData, `${prefix}.metaDescription`) || null,
    };
  });
}
