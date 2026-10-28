import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogProductSpecificationValue,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import type { CatalogLocale } from "@/lib/catalog/model";
import type {
  CatalogProductSpecificationConfigurationInput,
} from "@/lib/catalog/catalog-inputs";
import type { ProductRow } from "@/lib/catalog/public-product-index";
import type { PublicCatalogSpecification } from "@/lib/catalog/public-types";

export async function productSpecifications(
  row: ProductRow,
  locale: CatalogLocale,
): Promise<PublicCatalogSpecification[]> {
  const [specificationRows, valueRows] = await Promise.all([
    db
      .select()
      .from(catalogSpecification)
      .where(eq(catalogSpecification.categoryId, row.primaryCategoryId))
      .orderBy(
        asc(catalogSpecification.displayOrder),
        asc(catalogSpecification.id),
      ),
    db
      .select()
      .from(catalogProductSpecificationValue)
      .where(eq(catalogProductSpecificationValue.productId, row.id)),
  ]);
  const specificationIds = specificationRows.map(({ id }) => id);
  const [translationRows, optionRows] = specificationIds.length
    ? await Promise.all([
        db
          .select()
          .from(catalogSpecificationTranslation)
          .where(
            inArray(
              catalogSpecificationTranslation.specificationId,
              specificationIds,
            ),
          ),
        db
          .select()
          .from(catalogSpecificationOption)
          .where(
            inArray(
              catalogSpecificationOption.specificationId,
              specificationIds,
            ),
          ),
      ])
    : [[], []];
  const optionIds = optionRows.map(({ id }) => id);
  const optionTranslations = optionIds.length
    ? await db
        .select()
        .from(catalogSpecificationOptionTranslation)
        .where(
          inArray(catalogSpecificationOptionTranslation.optionId, optionIds),
        )
    : [];
  const excluded = new Set(
    (
      row.specificationConfiguration as CatalogProductSpecificationConfigurationInput
    ).excludedSpecificationIds,
  );
  const values = new Map(
    valueRows.map((value) => [value.specificationId, value]),
  );
  const result: PublicCatalogSpecification[] = [];

  for (const specification of specificationRows) {
    if (excluded.has(specification.id)) continue;
    const label = translationRows.find(
      (translation) =>
        translation.specificationId === specification.id &&
        translation.locale === locale,
    )?.label;
    const value = values.get(specification.id);
    if (!label || !value) continue;

    if (value.textValue !== null) {
      result.push({ label, value: value.textValue, unit: specification.unit });
    } else if (value.numberValue !== null) {
      result.push({
        label,
        value: value.numberValue,
        unit: specification.unit,
      });
    } else if (value.booleanValue !== null) {
      result.push({
        label,
        value: value.booleanValue,
        unit: specification.unit,
      });
    } else if (value.selectionOptionId) {
      const optionLabel = optionTranslations.find(
        (translation) =>
          translation.optionId === value.selectionOptionId &&
          translation.locale === locale,
      )?.label;
      if (optionLabel)
        result.push({ label, value: optionLabel, unit: specification.unit });
    }
  }

  return result;
}
