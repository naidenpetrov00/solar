"use client";

import { type ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { type SpecificationDraft } from "./catalog-editor-model";

export function localizedTranslationLabel(
  translations: Array<{ locale: CatalogLocale; label: string }>,
  activeLocale: CatalogLocale,
) {
  return (
    translations.find(({ locale }) => locale === activeLocale)?.label.trim() ||
    translations.find(({ locale }) => locale === "bg")?.label.trim() ||
    translations.map(({ label }) => label.trim()).find(Boolean) ||
    ""
  );
}

export function initialSpecifications(
  detail: ManagedCatalogCategoryDetail,
): SpecificationDraft[] {
  return detail.specifications.map((specification) => ({
    clientId: specification.id,
    persistedId: specification.id,
    valueType: specification.valueType,
    unit: specification.unit ?? "",
    isRequired: specification.isRequired,
    isFilterable: specification.isFilterable,
    labels: Object.fromEntries(
      catalogLocales.map((locale) => [
        locale,
        specification.translations.find(
          (translation) => translation.locale === locale,
        )?.label ?? "",
      ]),
    ) as Record<CatalogLocale, string>,
    options: specification.options.map((option) => ({
      clientId: option.id,
      persistedId: option.id,
      labels: Object.fromEntries(
        catalogLocales.map((locale) => [
          locale,
          option.translations.find(
            (translation) => translation.locale === locale,
          )?.label ?? "",
        ]),
      ) as Record<CatalogLocale, string>,
    })),
  }));
}

export function serializeSpecifications(specifications: SpecificationDraft[]) {
  return JSON.stringify(
    specifications.map((specification, specificationIndex) => ({
      id: specification.persistedId,
      valueType: specification.valueType,
      unit:
        specification.valueType === "number"
          ? specification.unit.trim() || null
          : null,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specificationIndex,
      translations: catalogLocales.flatMap((locale) =>
        specification.labels[locale].trim()
          ? [{ locale, label: specification.labels[locale] }]
          : [],
      ),
      options:
        specification.valueType === "selection"
          ? specification.options.map((option, optionIndex) => ({
              id: option.persistedId,
              displayOrder: optionIndex,
              translations: catalogLocales.flatMap((locale) =>
                option.labels[locale].trim()
                  ? [{ locale, label: option.labels[locale] }]
                  : [],
              ),
            }))
          : [],
    })),
  );
}

export function localizedSpecificationValue(
  values: Record<CatalogLocale, string>,
  activeLocale: CatalogLocale,
) {
  return (
    values[activeLocale].trim() ||
    values.bg.trim() ||
    catalogLocales.map((locale) => values[locale].trim()).find(Boolean) ||
    ""
  );
}
