import {
  isCatalogLocale,
  isUuid,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import type {
  CatalogProductSpecificationConfigurationInput,
  CatalogProductSpecificationValueInput,
  CatalogSpecificationTranslationInput,
} from "@/lib/catalog/catalog-inputs";

export function parseSpecificationValues(value: string) {
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
    )
      return null;
    if (candidate.type === "text" || candidate.type === "number") {
      if (!("value" in candidate) || typeof candidate.value !== "string")
        return null;
      values.push({
        specificationId: String(candidate.specificationId),
        type: candidate.type,
        value: candidate.value,
      });
    } else if (candidate.type === "boolean") {
      if (!("value" in candidate) || typeof candidate.value !== "boolean")
        return null;
      values.push({
        specificationId: String(candidate.specificationId),
        type: "boolean",
        value: candidate.value,
      });
    } else if (candidate.type === "selection") {
      if (!("optionId" in candidate) || !isUuid(String(candidate.optionId)))
        return null;
      values.push({
        specificationId: String(candidate.specificationId),
        type: "selection",
        optionId: String(candidate.optionId),
      });
    } else return null;
  }
  return values;
}

function parseTranslationsArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const translations: CatalogSpecificationTranslationInput[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("locale" in candidate) ||
      !isCatalogLocale(candidate.locale) ||
      !("label" in candidate) ||
      typeof candidate.label !== "string"
    )
      return null;
    translations.push({ locale: candidate.locale, label: candidate.label });
  }
  return translations;
}

export function parseSpecificationConfiguration(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("excludedSpecificationIds" in parsed) ||
    !Array.isArray(parsed.excludedSpecificationIds) ||
    !parsed.excludedSpecificationIds.every(
      (candidate) => typeof candidate === "string" && isUuid(candidate),
    ) ||
    !("customSpecifications" in parsed) ||
    !Array.isArray(parsed.customSpecifications)
  )
    return null;

  const customSpecifications: CatalogProductSpecificationConfigurationInput["customSpecifications"] =
    [];
  for (const [
    displayOrder,
    candidate,
  ] of parsed.customSpecifications.entries()) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      !isUuid(String(candidate.id)) ||
      !("valueType" in candidate) ||
      !["text", "number", "boolean", "selection"].includes(
        String(candidate.valueType),
      ) ||
      !("translations" in candidate) ||
      !("options" in candidate) ||
      !Array.isArray(candidate.options)
    )
      return null;
    const translations = parseTranslationsArray(candidate.translations);
    if (!translations) return null;
    const options: CatalogProductSpecificationConfigurationInput["customSpecifications"][number]["options"] =
      [];
    for (const [optionOrder, option] of candidate.options.entries()) {
      if (
        typeof option !== "object" ||
        option === null ||
        !("id" in option) ||
        !isUuid(String(option.id)) ||
        !("translations" in option)
      )
        return null;
      const optionTranslations = parseTranslationsArray(option.translations);
      if (!optionTranslations) return null;
      options.push({
        id: String(option.id),
        displayOrder: optionOrder,
        translations: optionTranslations,
      });
    }
    const valueType = String(
      candidate.valueType,
    ) as CatalogSpecificationValueType;
    const rawValue = "value" in candidate ? candidate.value : null;
    let specificationValue: CatalogProductSpecificationConfigurationInput["customSpecifications"][number]["value"] =
      null;
    if (rawValue !== null) {
      if (typeof rawValue !== "object" || !("type" in rawValue)) return null;
      if (
        (rawValue.type === "text" || rawValue.type === "number") &&
        "value" in rawValue &&
        typeof rawValue.value === "string"
      ) {
        specificationValue = { type: rawValue.type, value: rawValue.value };
      } else if (
        rawValue.type === "boolean" &&
        "value" in rawValue &&
        typeof rawValue.value === "boolean"
      ) {
        specificationValue = { type: "boolean", value: rawValue.value };
      } else if (
        rawValue.type === "selection" &&
        "optionId" in rawValue &&
        isUuid(String(rawValue.optionId))
      ) {
        specificationValue = {
          type: "selection",
          optionId: String(rawValue.optionId),
        };
      } else return null;
    }
    customSpecifications.push({
      id: String(candidate.id),
      valueType,
      unit:
        "unit" in candidate && typeof candidate.unit === "string"
          ? candidate.unit
          : null,
      displayOrder,
      translations,
      options,
      value: specificationValue,
    });
  }
  return {
    excludedSpecificationIds: parsed.excludedSpecificationIds.map(String),
    customSpecifications,
  } satisfies CatalogProductSpecificationConfigurationInput;
}
