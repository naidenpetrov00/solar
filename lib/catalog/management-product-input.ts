import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { catalogSpecification } from "@/db/schema";
import {
  assertUniqueLocales,
  hasAllCatalogLocales,
  validateDecimal,
} from "@/lib/catalog/model";
import {
  type CatalogProductSpecificationConfigurationInput,
  type CatalogProductTranslationInput,
} from "@/lib/catalog/catalog-inputs";
import {
  normalizeLongText,
  normalizeOptionalText,
  normalizeRequiredText,
  validateSlug,
} from "@/lib/catalog/text-validation";
import { type CatalogTransaction } from "@/lib/catalog/actor-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { assertIdentifier } from "@/lib/catalog/management-access";

export function normalizeProductTranslations(
  translations: CatalogProductTranslationInput[],
) {
  assertUniqueLocales(translations);
  return translations.map((translation) => ({
    locale: translation.locale,
    title: normalizeOptionalText(translation.title, 200) ?? "",
    shortDescription:
      normalizeOptionalText(translation.shortDescription, 2000) ?? "",
    fullDescription:
      normalizeLongText(translation.fullDescription, 50_000) ?? "",
    marketingLabel: normalizeOptionalText(translation.marketingLabel, 200),
    seoTitle: normalizeOptionalText(translation.seoTitle, 200),
    metaDescription: normalizeOptionalText(translation.metaDescription, 500),
  }));
}

export function normalizeOptionalProductSlug(value: string | null | undefined) {
  return value ? validateSlug(value) : null;
}

export function normalizeProductSpecificationConfiguration(
  configuration: CatalogProductSpecificationConfigurationInput,
) {
  const excludedSpecificationIds = [
    ...new Set(configuration.excludedSpecificationIds),
  ];
  if (
    excludedSpecificationIds.length !==
    configuration.excludedSpecificationIds.length
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  excludedSpecificationIds.forEach(assertIdentifier);

  const customIds = new Set<string>();
  const customOptionIds = new Set<string>();
  const customSpecifications = configuration.customSpecifications.map(
    (specification, displayOrder) => {
      assertIdentifier(specification.id);
      if (customIds.has(specification.id)) {
        throw new CatalogManagementError("INVALID_INPUT");
      }
      customIds.add(specification.id);
      assertUniqueLocales(specification.translations);
      if (!hasAllCatalogLocales(specification.translations)) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const options = specification.options.map((option, optionOrder) => {
        assertIdentifier(option.id);
        if (customOptionIds.has(option.id)) {
          throw new CatalogManagementError("INVALID_INPUT");
        }
        customOptionIds.add(option.id);
        assertUniqueLocales(option.translations);
        if (!hasAllCatalogLocales(option.translations)) {
          throw new CatalogManagementError("INVALID_INPUT");
        }
        return {
          id: option.id,
          displayOrder: optionOrder,
          translations: option.translations.map((translation) => ({
            locale: translation.locale,
            label: normalizeOptionalText(translation.label, 200) ?? "",
          })),
        };
      });

      if (specification.valueType !== "selection" && options.length > 0) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      let value = specification.value;
      if (value && value.type !== specification.valueType) {
        throw new CatalogManagementError("INVALID_INPUT");
      }
      if (value?.type === "text") {
        value = {
          type: "text",
          value: normalizeRequiredText(value.value, 5000),
        };
      } else if (value?.type === "number") {
        value = { type: "number", value: validateDecimal(value.value) };
      } else if (value?.type === "selection") {
        const selectedOptionId = value.optionId;
        if (!options.some(({ id }) => id === selectedOptionId)) {
          throw new CatalogManagementError("INVALID_INPUT");
        }
      }

      return {
        id: specification.id,
        valueType: specification.valueType,
        unit: normalizeOptionalText(specification.unit, 40),
        displayOrder,
        translations: specification.translations.map((translation) => ({
          locale: translation.locale,
          label: normalizeOptionalText(translation.label, 200) ?? "",
        })),
        options,
        value,
      };
    },
  );

  return { excludedSpecificationIds, customSpecifications };
}

export async function assertProductSpecificationConfiguration(
  transaction: CatalogTransaction,
  primaryCategoryId: string,
  configuration: ReturnType<typeof normalizeProductSpecificationConfiguration>,
) {
  if (configuration.excludedSpecificationIds.length === 0) return;
  const rows = await transaction
    .select({ id: catalogSpecification.id })
    .from(catalogSpecification)
    .where(
      and(
        eq(catalogSpecification.categoryId, primaryCategoryId),
        inArray(
          catalogSpecification.id,
          configuration.excludedSpecificationIds,
        ),
      ),
    );
  if (rows.length !== configuration.excludedSpecificationIds.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}
