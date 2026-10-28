import type { CatalogSpecificationEditorInput } from "@/lib/catalog/management-category-types";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  normalizeSpecifications,
  type PersistedNormalizedCatalogSpecification,
} from "@/lib/catalog/management-category-specifications";
import {
  bulgarianSpecificationLabel,
  uniqueGeneratedStableKey,
} from "@/lib/catalog/management-specification-keys";

type ExistingSpecification = { id: string; key: string };
type ExistingOption = { id: string; specificationId: string; code: string };

export function resolveCategorySpecifications(
  inputSpecifications: CatalogSpecificationEditorInput[],
  existingSpecifications: ExistingSpecification[],
  existingOptions: ExistingOption[],
): PersistedNormalizedCatalogSpecification[] {
  const specificationsById = new Map(
    existingSpecifications.map((specification) => [
      specification.id,
      specification,
    ]),
  );
  const optionsById = new Map(
    existingOptions.map((option) => [option.id, option]),
  );
  const submittedSpecificationIds = new Set<string>();
  const submittedOptionIds = new Set<string>();
  const reservedSpecificationKeys = new Set(
    existingSpecifications.map(({ key }) => key),
  );
  const resolvedSpecifications = inputSpecifications.map((specification) => {
    const existingSpecification = specification.id
      ? specificationsById.get(specification.id)
      : undefined;

    if (
      (specification.id && !existingSpecification) ||
      (specification.id && submittedSpecificationIds.has(specification.id))
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    if (specification.id) submittedSpecificationIds.add(specification.id);
    const bgLabel = bulgarianSpecificationLabel(specification.translations);
    if (!existingSpecification && !bgLabel) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    const key =
      existingSpecification?.key ??
      uniqueGeneratedStableKey(
        bgLabel,
        reservedSpecificationKeys,
        "specification",
      );
    const reservedOptionCodes = new Set(
      existingOptions
        .filter(
          ({ specificationId }) =>
            specificationId === existingSpecification?.id,
        )
        .map(({ code }) => code),
    );
    const options = specification.options.map((option) => {
      const existingOption = option.id ? optionsById.get(option.id) : undefined;

      if (
        (option.id && !existingOption) ||
        (existingOption &&
          existingOption.specificationId !== existingSpecification?.id) ||
        (option.id && submittedOptionIds.has(option.id))
      ) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      if (option.id) submittedOptionIds.add(option.id);
      const optionBgLabel = bulgarianSpecificationLabel(option.translations);
      if (!existingOption && !optionBgLabel) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      return {
        id: existingOption?.id,
        code:
          existingOption?.code ??
          uniqueGeneratedStableKey(
            optionBgLabel,
            reservedOptionCodes,
            "option",
          ),
        displayOrder: option.displayOrder,
        translations: option.translations,
      };
    });

    return {
      id: existingSpecification?.id,
      key,
      valueType: specification.valueType,
      unit: specification.valueType === "number" ? specification.unit : null,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specification.displayOrder,
      translations: specification.translations,
      options: specification.valueType === "selection" ? options : [],
    };
  });
  const specifications: PersistedNormalizedCatalogSpecification[] =
    normalizeSpecifications(resolvedSpecifications).map(
      (specification, specificationIndex) => ({
        ...specification,
        id: resolvedSpecifications[specificationIndex].id,
        options: specification.options.map((option, optionIndex) => ({
          ...option,
          id: resolvedSpecifications[specificationIndex].options[optionIndex]
            ?.id,
        })),
      }),
    );

  return specifications;
}
