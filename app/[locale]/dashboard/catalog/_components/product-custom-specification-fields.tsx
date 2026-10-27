import {
  catalogLocales,
  type CatalogLocale,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import { DashboardSelect } from "../../_components/dashboard-select";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import { Field } from "./product-editor-fields";
import type { ProductCustomSpecificationProps } from "./product-specification-model";
export function ProductCustomSpecificationFields({
  specification,
  props,
}: ProductCustomSpecificationProps) {
  const {
    labels,
    languages,
    activeLocale,
    setActiveLocale,
    setCustomSpecifications,
  } = props;
  return (
    <>
      <LocalizedEditorSwitch
        idPrefix={`custom-spec-${specification.id}`}
        variant="selector"
        activeLocale={activeLocale}
        onChange={setActiveLocale}
        languageNames={languages}
        statusByLocale={
          Object.fromEntries(
            catalogLocales.map((contentLocale) => [
              contentLocale,
              Boolean(specification.labels[contentLocale].trim()),
            ]),
          ) as Record<CatalogLocale, boolean>
        }
        completeLabel={labels.editor.complete}
        incompleteLabel={labels.editor.incomplete}
        ariaLabel={labels.specifications.customName.label}
      />
      <div className="dashboard-catalog-product-form-grid">
        <Field
          id={`custom-spec-${specification.id}-name`}
          copy={labels.specifications.customName}
        >
          <input
            id={`custom-spec-${specification.id}-name`}
            value={specification.labels[activeLocale]}
            onChange={(event) =>
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? {
                        ...item,
                        labels: {
                          ...item.labels,
                          [activeLocale]: event.target.value,
                        },
                      }
                    : item,
                ),
              )
            }
            aria-describedby={`custom-spec-${specification.id}-name-help`}
          />
        </Field>
        <Field
          id={`custom-spec-${specification.id}-type`}
          copy={labels.specifications.customType}
        >
          <DashboardSelect
            id={`custom-spec-${specification.id}-type`}
            value={specification.valueType}
            onChange={(event) => {
              const valueType = event.target
                .value as CatalogSpecificationValueType;
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? {
                        ...item,
                        valueType,
                        value: null,
                        options: valueType === "selection" ? item.options : [],
                      }
                    : item,
                ),
              );
            }}
            aria-describedby={`custom-spec-${specification.id}-type-help`}
          >
            {Object.entries(labels.specifications.types).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </DashboardSelect>
        </Field>
        <Field
          id={`custom-spec-${specification.id}-unit`}
          copy={labels.specifications.customUnit}
        >
          <input
            id={`custom-spec-${specification.id}-unit`}
            value={specification.unit ?? ""}
            onChange={(event) =>
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? { ...item, unit: event.target.value }
                    : item,
                ),
              )
            }
            maxLength={40}
            aria-describedby={`custom-spec-${specification.id}-unit-help`}
          />
        </Field>
      </div>
    </>
  );
}
