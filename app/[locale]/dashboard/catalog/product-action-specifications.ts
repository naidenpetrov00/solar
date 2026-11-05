import { isUuid } from "@/lib/catalog/model";
import type {
  CatalogProductSpecificationConfigurationInput,
  CatalogProductSpecificationValueInput,
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
    !Array.isArray(parsed.customSpecifications) ||
    parsed.customSpecifications.length > 0
  )
    return null;
  return {
    excludedSpecificationIds: parsed.excludedSpecificationIds.map(String),
    customSpecifications: [],
  } satisfies CatalogProductSpecificationConfigurationInput;
}
