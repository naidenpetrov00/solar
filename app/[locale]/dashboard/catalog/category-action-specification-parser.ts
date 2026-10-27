import type { CatalogSpecificationEditorInput } from "@/lib/catalog/management-category-types";
import { catalogLocales, isCatalogLocale, isUuid } from "@/lib/catalog/model";
import { hasOnlyKeys } from "./category-action-context";

function parseSpecificationTranslations(value: unknown) {
  if (!Array.isArray(value)) return null;

  const translations: Array<{
    locale: (typeof catalogLocales)[number];
    label: string;
  }> = [];

  for (const candidate of value) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !hasOnlyKeys(candidate, ["locale", "label"]) ||
      !("locale" in candidate) ||
      !("label" in candidate) ||
      !isCatalogLocale(candidate.locale) ||
      typeof candidate.label !== "string"
    ) {
      return null;
    }

    translations.push({ locale: candidate.locale, label: candidate.label });
  }

  return translations;
}

export function parseSpecifications(
  value: string,
): CatalogSpecificationEditorInput[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  const specifications: CatalogSpecificationEditorInput[] = [];

  for (const candidate of parsed) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !hasOnlyKeys(candidate, [
        "id",
        "valueType",
        "unit",
        "displayOrder",
        "translations",
        "options",
      ]) ||
      !("id" in candidate) ||
      "key" in candidate ||
      "isRequired" in candidate ||
      "isFilterable" in candidate ||
      (candidate.id !== null &&
        (typeof candidate.id !== "string" || !isUuid(candidate.id))) ||
      !("valueType" in candidate) ||
      !["text", "number", "boolean", "selection"].includes(
        String(candidate.valueType),
      ) ||
      !("unit" in candidate) ||
      (candidate.unit !== null && typeof candidate.unit !== "string") ||
      !("displayOrder" in candidate) ||
      typeof candidate.displayOrder !== "number" ||
      !Number.isSafeInteger(candidate.displayOrder) ||
      candidate.displayOrder < 0 ||
      !("translations" in candidate) ||
      !("options" in candidate)
    ) {
      return null;
    }

    const translations = parseSpecificationTranslations(candidate.translations);
    if (!translations || !Array.isArray(candidate.options)) return null;
    const options: CatalogSpecificationEditorInput["options"] = [];

    for (const option of candidate.options) {
      if (
        typeof option !== "object" ||
        option === null ||
        !hasOnlyKeys(option, ["id", "displayOrder", "translations"]) ||
        !("id" in option) ||
        "code" in option ||
        (option.id !== null &&
          (typeof option.id !== "string" || !isUuid(option.id))) ||
        !("displayOrder" in option) ||
        typeof option.displayOrder !== "number" ||
        !Number.isSafeInteger(option.displayOrder) ||
        option.displayOrder < 0 ||
        !("translations" in option)
      ) {
        return null;
      }

      const optionTranslations = parseSpecificationTranslations(
        option.translations,
      );
      if (!optionTranslations) return null;
      options.push({
        id: option.id,
        displayOrder: option.displayOrder,
        translations: optionTranslations,
      });
    }

    specifications.push({
      id: candidate.id,
      valueType:
        candidate.valueType as CatalogSpecificationEditorInput["valueType"],
      unit: candidate.unit,
      displayOrder: candidate.displayOrder,
      translations,
      options,
    });
  }

  return specifications;
}
