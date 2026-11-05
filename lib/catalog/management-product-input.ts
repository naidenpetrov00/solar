import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { catalogSpecification } from "@/db/schema";
import { assertUniqueLocales } from "@/lib/catalog/model";
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

  if (configuration.customSpecifications.length > 0) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  return {
    excludedSpecificationIds,
    customSpecifications: [],
  } satisfies CatalogProductSpecificationConfigurationInput;
}

export async function assertProductSpecificationConfiguration(
  transaction: CatalogTransaction,
  primaryCategoryId: string,
  configuration: ReturnType<typeof normalizeProductSpecificationConfiguration>,
) {
  if (configuration.excludedSpecificationIds.length === 0) return;
  const rows = await transaction
    .select({
      id: catalogSpecification.id,
      isRequired: catalogSpecification.isRequired,
    })
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
  if (
    rows.length !== configuration.excludedSpecificationIds.length ||
    rows.some(({ isRequired }) => isRequired)
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}
