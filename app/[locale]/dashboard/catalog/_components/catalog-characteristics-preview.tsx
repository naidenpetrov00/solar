"use client";

import {
  type CatalogLocale,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import { type SpecificationDraft } from "./catalog-editor-model";
import { type CatalogLabels } from "./catalog-labels";
import { localizedSpecificationValue } from "./catalog-specification-draft";

export function ProductCharacteristicsPreview({
  specifications,
  labels,
  activeLocale,
}: {
  specifications: SpecificationDraft[];
  labels: CatalogLabels;
  activeLocale: CatalogLocale;
}) {
  const rows =
    specifications.length > 0
      ? specifications.map((specification) => {
          const label =
            localizedSpecificationValue(specification.labels, activeLocale) ||
            labels.specifications.preview.labels[specification.valueType];
          const selectedOption = specification.options.find((option) =>
            localizedSpecificationValue(option.labels, activeLocale),
          );
          const optionLabel = selectedOption
            ? localizedSpecificationValue(selectedOption.labels, activeLocale)
            : "";
          const sampleValue =
            labels.specifications.preview.values[specification.valueType];
          const value =
            specification.valueType === "number" && specification.unit.trim()
              ? `${sampleValue} ${specification.unit.trim()}`
              : specification.valueType === "selection" && optionLabel
                ? optionLabel
                : sampleValue;

          return {
            id: specification.clientId,
            label,
            value,
          };
        })
      : (
          Object.keys(
            labels.specifications.preview.labels,
          ) as CatalogSpecificationValueType[]
        ).map((valueType) => ({
          id: `product-characteristics-example-${valueType}`,
          label: labels.specifications.preview.labels[valueType],
          value:
            valueType === "number"
              ? `${labels.specifications.preview.values.number} ${labels.specifications.preview.emptyUnit}`
              : labels.specifications.preview.values[valueType],
        }));

  return (
    <aside
      className="dashboard-catalog-product-preview"
      aria-labelledby="catalog-product-preview-title"
    >
      <div className="dashboard-catalog-product-preview-heading">
        <div>
          <h3 id="catalog-product-preview-title">
            {labels.specifications.preview.title}
          </h3>
          <p>{labels.specifications.preview.description}</p>
        </div>
        <small>{labels.specifications.preview.illustrative}</small>
      </div>
      <dl className="dashboard-catalog-product-preview-list">
        {rows.map((row) => (
          <div key={row.id}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
