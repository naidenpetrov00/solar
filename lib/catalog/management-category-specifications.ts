import "server-only";
import {
  assertUniqueLocales,
  hasAllCatalogLocales,
  validateNonNegativeInteger,
} from "@/lib/catalog/model";
import { type CatalogSpecificationInput } from "@/lib/catalog/catalog-inputs";
import {
  normalizeOptionalText,
  normalizeRequiredText,
  validateStableKey,
} from "@/lib/catalog/text-validation";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { type CatalogSpecificationEditorInput } from "@/lib/catalog/management-category-types";

export function normalizeSpecifications(
  specifications: CatalogSpecificationInput[],
) {
  const keys = new Set<string>();

  return specifications.map((specification) => {
    const key = validateStableKey(specification.key);

    if (keys.has(key)) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    keys.add(key);
    assertUniqueLocales(specification.translations);

    if (
      specification.valueType !== "selection" &&
      specification.options.length !== 0
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    const optionCodes = new Set<string>();
    const options = specification.options.map((option) => {
      const code = validateStableKey(option.code);

      if (optionCodes.has(code)) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      optionCodes.add(code);
      assertUniqueLocales(option.translations);
      return {
        code,
        displayOrder: validateNonNegativeInteger(option.displayOrder),
        translations: option.translations.map((translation) => ({
          locale: translation.locale,
          label: normalizeRequiredText(translation.label, 200),
        })),
      };
    });

    return {
      key,
      valueType: specification.valueType,
      unit: normalizeOptionalText(specification.unit, 40),
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: validateNonNegativeInteger(specification.displayOrder),
      translations: specification.translations.map((translation) => ({
        locale: translation.locale,
        label: normalizeRequiredText(translation.label, 200),
      })),
      options,
    };
  });
}

export type PersistedNormalizedCatalogSpecification = ReturnType<
  typeof normalizeSpecifications
>[number] & {
  id?: string;
  options: Array<
    ReturnType<typeof normalizeSpecifications>[number]["options"][number] & {
      id?: string;
    }
  >;
};

export function assertCompleteEditorSpecifications(
  specifications: CatalogSpecificationEditorInput[],
) {
  for (const specification of specifications) {
    assertUniqueLocales(specification.translations);
    if (!hasAllCatalogLocales(specification.translations)) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    if (
      specification.valueType === "selection" &&
      specification.options.length === 0
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    for (const option of specification.options) {
      assertUniqueLocales(option.translations);
      if (!hasAllCatalogLocales(option.translations)) {
        throw new CatalogManagementError("INVALID_INPUT");
      }
    }
  }
}
