import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogProductSpecificationValue,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import type { CatalogProductSpecificationConfigurationInput } from "@/lib/catalog/catalog-inputs";
import type { CatalogLocale } from "@/lib/catalog/model";
import {
  publicCategoryFromRow,
  type CategoryIndex,
} from "@/lib/catalog/public-category-index";
import type { ParsedPublicCatalogQuery } from "@/lib/catalog/public-catalog-query";
import type { ProductRow } from "@/lib/catalog/public-product-index";
import type {
  PublicCatalogFacet,
  PublicCatalogFacetOption,
} from "@/lib/catalog/public-types";

type FacetData = {
  facets: PublicCatalogFacet[];
  productValues: Map<string, Map<string, string>>;
};

function option(
  value: string,
  label: string | null,
  count: number,
  selected: Set<string>,
): PublicCatalogFacetOption {
  return { value, label, count, selected: selected.has(value) };
}

export async function loadPublicCatalogFacets(
  rows: ProductRow[],
  categoryIndex: CategoryIndex,
  locale: CatalogLocale,
  query: ParsedPublicCatalogQuery,
): Promise<FacetData> {
  const categoryIds = [
    ...new Set(rows.map(({ primaryCategoryId }) => primaryCategoryId)),
  ];
  if (categoryIds.length === 0) return { facets: [], productValues: new Map() };

  const specifications = await db
    .select()
    .from(catalogSpecification)
    .where(
      and(
        eq(catalogSpecification.isFilterable, true),
        inArray(catalogSpecification.categoryId, categoryIds),
      ),
    )
    .orderBy(
      asc(catalogSpecification.categoryId),
      asc(catalogSpecification.displayOrder),
      asc(catalogSpecification.id),
    );
  if (specifications.length === 0) {
    return { facets: [], productValues: new Map() };
  }

  const categoryOrder = new Map(
    categoryIndex.rows.map(({ id }, index) => [id, index]),
  );
  const orderedSpecifications = specifications.toSorted(
    (left, right) =>
      (categoryOrder.get(left.categoryId) ?? 0) -
        (categoryOrder.get(right.categoryId) ?? 0) ||
      left.displayOrder - right.displayOrder ||
      left.id.localeCompare(right.id),
  );
  const specificationIds = orderedSpecifications.map(({ id }) => id);
  const productIds = rows.map(({ id }) => id);
  const [translations, options, values] = await Promise.all([
    db
      .select()
      .from(catalogSpecificationTranslation)
      .where(
        and(
          inArray(
            catalogSpecificationTranslation.specificationId,
            specificationIds,
          ),
          eq(catalogSpecificationTranslation.locale, locale),
        ),
      ),
    db
      .select()
      .from(catalogSpecificationOption)
      .where(
        inArray(catalogSpecificationOption.specificationId, specificationIds),
      )
      .orderBy(
        asc(catalogSpecificationOption.displayOrder),
        asc(catalogSpecificationOption.id),
      ),
    db
      .select()
      .from(catalogProductSpecificationValue)
      .where(
        and(
          inArray(catalogProductSpecificationValue.productId, productIds),
          inArray(
            catalogProductSpecificationValue.specificationId,
            specificationIds,
          ),
        ),
      ),
  ]);
  const optionIds = options.map(({ id }) => id);
  const optionTranslations = optionIds.length
    ? await db
        .select()
        .from(catalogSpecificationOptionTranslation)
        .where(
          and(
            inArray(catalogSpecificationOptionTranslation.optionId, optionIds),
            eq(catalogSpecificationOptionTranslation.locale, locale),
          ),
        )
    : [];
  const optionLabels = new Map(
    optionTranslations.map(({ optionId, label }) => [optionId, label]),
  );
  const productValues = new Map<string, Map<string, string>>();
  const counts = new Map<string, Map<string, number>>();
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  for (const value of values) {
    const row = rowsById.get(value.productId);
    const configuration = row?.specificationConfiguration as
      | CatalogProductSpecificationConfigurationInput
      | undefined;
    if (
      configuration?.excludedSpecificationIds?.includes(value.specificationId)
    ) {
      continue;
    }
    const normalized =
      value.textValue ??
      value.numberValue ??
      (value.booleanValue === null
        ? value.selectionOptionId
        : String(value.booleanValue));
    if (normalized === null) continue;
    const bySpecification = productValues.get(value.productId) ?? new Map();
    bySpecification.set(value.specificationId, normalized);
    productValues.set(value.productId, bySpecification);
    const specificationCounts = counts.get(value.specificationId) ?? new Map();
    specificationCounts.set(
      normalized,
      (specificationCounts.get(normalized) ?? 0) + 1,
    );
    counts.set(value.specificationId, specificationCounts);
  }

  const labels = new Map(
    translations.map(({ specificationId, label }) => [specificationId, label]),
  );
  const labelCounts = new Map<string, number>();
  for (const label of labels.values()) {
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const facets = orderedSpecifications.flatMap(
    (specification): PublicCatalogFacet[] => {
      const label = labels.get(specification.id);
      const specificationCounts = counts.get(specification.id);
      if (!label || !specificationCounts?.size) return [];
      const selected = new Set(query.values.get(specification.id) ?? []);
      let facetOptions: PublicCatalogFacetOption[] = [];
      let minimum: string | null = null;
      let maximum: string | null = null;

      if (specification.valueType === "selection") {
        facetOptions = options.flatMap((item) => {
          if (item.specificationId !== specification.id) return [];
          const count = specificationCounts.get(item.id) ?? 0;
          const itemLabel = optionLabels.get(item.id);
          return count && itemLabel
            ? [option(item.id, itemLabel, count, selected)]
            : [];
        });
      } else if (specification.valueType === "boolean") {
        facetOptions = ["true", "false"].flatMap((value) => {
          const count = specificationCounts.get(value) ?? 0;
          return count ? [option(value, null, count, selected)] : [];
        });
      } else if (specification.valueType === "text") {
        facetOptions = [...specificationCounts.entries()]
          .toSorted(([left], [right]) => left.localeCompare(right, locale))
          .map(([value, count]) => option(value, value, count, selected));
      } else {
        const numericValues = [...specificationCounts.keys()].toSorted(
          (left, right) => Number(left) - Number(right),
        );
        minimum = numericValues[0] ?? null;
        maximum = numericValues.at(-1) ?? null;
      }

      const category = categoryIndex.byId.get(specification.categoryId);
      const context = category
        ? publicCategoryFromRow(categoryIndex, category, locale)?.name ?? null
        : null;
      return [
        {
          id: specification.id,
          label,
          contextLabel: (labelCounts.get(label) ?? 0) > 1 ? context : null,
          valueType: specification.valueType as PublicCatalogFacet["valueType"],
          unit: specification.unit,
          options: facetOptions,
          minimum,
          maximum,
          selectedMinimum:
            specification.valueType === "number"
              ? query.minimums.get(specification.id) ?? null
              : null,
          selectedMaximum:
            specification.valueType === "number"
              ? query.maximums.get(specification.id) ?? null
              : null,
        },
      ];
    },
  );

  return { facets, productValues };
}
