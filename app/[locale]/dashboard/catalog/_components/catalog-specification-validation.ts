import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { SpecificationDraft } from "./catalog-editor-model";

export function firstInvalidSpecification(
  specifications: SpecificationDraft[],
  specificationLocale: CatalogLocale,
):
  | {
      specification: SpecificationDraft;
      locale: CatalogLocale;
      targetId: string;
    }
  | undefined {
  let invalid:
    | {
        specification: SpecificationDraft;
        locale: CatalogLocale;
        targetId: string;
      }
    | undefined;

  for (const specification of specifications) {
    for (const contentLocale of catalogLocales) {
      if (!specification.labels[contentLocale].trim()) {
        invalid = {
          specification,
          locale: contentLocale,
          targetId: `specification-name-${specification.clientId}-${contentLocale}`,
        };
        break;
      }
    }
    if (invalid) break;

    if (
      specification.valueType === "selection" &&
      specification.options.length === 0
    ) {
      invalid = {
        specification,
        locale: specificationLocale,
        targetId: `specification-add-option-${specification.clientId}`,
      };
      break;
    }

    for (const option of specification.options) {
      for (const contentLocale of catalogLocales) {
        if (!option.labels[contentLocale].trim()) {
          invalid = {
            specification,
            locale: contentLocale,
            targetId: `specification-option-${option.clientId}-${contentLocale}`,
          };
          break;
        }
      }
      if (invalid) break;
    }
    if (invalid) break;
  }

  return invalid;
}
