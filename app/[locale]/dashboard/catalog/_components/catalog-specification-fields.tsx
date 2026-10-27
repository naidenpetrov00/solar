import { DashboardSelect } from "../../_components/dashboard-select";
import type {
  CatalogLocale,
  CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import type { CatalogLabels } from "./catalog-labels";
import type { SpecificationDraft } from "./catalog-editor-model";
import { Field, CharacterCount } from "./catalog-editor-fields";

export function SpecificationFields({
  specification,
  index,
  specificationLocale,
  labels,
  nameId,
  nameError,
  clientValidationId,
  updateSpecification,
  setClientValidationId,
}: {
  specification: SpecificationDraft;
  index: number;
  specificationLocale: CatalogLocale;
  labels: CatalogLabels;
  nameId: string;
  nameError: boolean;
  clientValidationId: string | null;
  updateSpecification: (
    index: number,
    update: (current: SpecificationDraft) => SpecificationDraft,
  ) => void;
  setClientValidationId: (value: string | null) => void;
}) {
  return (
    <div className="dashboard-catalog-specification-grid">
      <Field
        id={`specification-type-${specification.clientId}`}
        copy={labels.specifications.type}
      >
        <DashboardSelect
          id={`specification-type-${specification.clientId}`}
          value={specification.valueType}
          onChange={(event) => {
            const value = event.target.value as CatalogSpecificationValueType;
            if (
              specification.valueType === "selection" &&
              value !== "selection" &&
              specification.options.length > 0 &&
              !window.confirm(labels.specifications.confirmClearOptions)
            ) {
              return;
            }
            updateSpecification(index, (current) => ({
              ...current,
              valueType: value,
              unit: value === "number" ? current.unit : "",
              options: value === "selection" ? current.options : [],
            }));
          }}
          aria-describedby={`specification-type-${specification.clientId}-help`}
        >
          {Object.entries(labels.specifications.types).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </DashboardSelect>
      </Field>
      <Field
        id={nameId}
        copy={labels.specifications.name}
        count={
          <CharacterCount
            value={specification.labels[specificationLocale]}
            maximum={200}
          />
        }
        error={nameError ? labels.validation.required : undefined}
      >
        <input
          id={nameId}
          value={specification.labels[specificationLocale]}
          onChange={(event) => {
            if (clientValidationId === nameId) {
              setClientValidationId(null);
            }
            updateSpecification(index, (current) => ({
              ...current,
              labels: {
                ...current.labels,
                [specificationLocale]: event.target.value,
              },
            }));
          }}
          required
          maxLength={200}
          aria-describedby={`${nameId}-help${nameError ? ` ${nameId}-error` : ""}`}
          aria-invalid={nameError ? true : undefined}
        />
      </Field>
      {specification.valueType === "number" ? (
        <Field
          id={`specification-unit-${specification.clientId}`}
          copy={labels.specifications.unit}
        >
          <input
            id={`specification-unit-${specification.clientId}`}
            value={specification.unit}
            onChange={(event) =>
              updateSpecification(index, (current) => ({
                ...current,
                unit: event.target.value,
              }))
            }
            maxLength={40}
            aria-describedby={`specification-unit-${specification.clientId}-help`}
          />
        </Field>
      ) : null}
    </div>
  );
}
