import "server-only";
import { catalogLocales } from "./model";
import type { CatalogProductSpecificationConfigurationInput } from "./catalog-inputs";
import type { getProductPublicationAggregate } from "./product-repository";
import type { CatalogProductPublicationIssue } from "./management-product-types";

type PublicationAggregate = NonNullable<
  Awaited<ReturnType<typeof getProductPublicationAggregate>>
>;
export function specificationIssues(
  aggregate: PublicationAggregate,
  issues: CatalogProductPublicationIssue[],
) {
  const product = aggregate.product;
  const valueBySpecification = new Map(
    aggregate.specificationValues.map((value) => [
      value.specificationId,
      value,
    ]),
  );
  const selectedOptionById = new Map(
    aggregate.selectedOptions.map((option) => [option.id, option]),
  );

  const specificationConfiguration =
    product.specificationConfiguration as CatalogProductSpecificationConfigurationInput;
  const excludedIds = new Set(
    specificationConfiguration.excludedSpecificationIds,
  );
  for (const specification of aggregate.specifications) {
    if (excludedIds.has(specification.id)) continue;
    const value = valueBySpecification.get(specification.id);

    if (specification.isRequired && !value) {
      issues.push({
        code: "MISSING_REQUIRED_SPECIFICATION",
        specificationId: specification.id,
      });
    }

    if (!value) continue;

    const valid =
      (specification.valueType === "text" && value.textValue !== null) ||
      (specification.valueType === "number" && value.numberValue !== null) ||
      (specification.valueType === "boolean" && value.booleanValue !== null) ||
      (specification.valueType === "selection" &&
        value.selectionOptionId !== null &&
        selectedOptionById.get(value.selectionOptionId)?.specificationId ===
          specification.id);

    if (!valid) {
      issues.push({
        code: "INVALID_SPECIFICATION_VALUE",
        specificationId: specification.id,
      });
    }
  }

  for (const specification of specificationConfiguration.customSpecifications) {
    for (const locale of catalogLocales) {
      if (
        !specification.translations.find(
          (translation) =>
            translation.locale === locale && translation.label.trim(),
        )
      ) {
        issues.push({
          code: "MISSING_CUSTOM_SPECIFICATION_LABEL",
          specificationId: specification.id,
          locale,
        });
      }
    }
    if (specification.valueType === "selection") {
      for (const option of specification.options) {
        for (const locale of catalogLocales) {
          if (
            !option.translations.find(
              (translation) =>
                translation.locale === locale && translation.label.trim(),
            )
          ) {
            issues.push({
              code: "MISSING_CUSTOM_OPTION_LABEL",
              specificationId: specification.id,
              optionId: option.id,
              locale,
            });
          }
        }
      }
    }
    if (!specification.value) {
      issues.push({
        code: "MISSING_REQUIRED_SPECIFICATION",
        specificationId: specification.id,
      });
    }
  }
}
