import type { CatalogLocale } from "@/lib/catalog/model";
import type { CatalogLabels } from "./catalog-labels";
import type { SpecificationDraft } from "./catalog-editor-model";
import { DashboardButton } from "./catalog-editor-actions";
import { Field, CharacterCount } from "./catalog-editor-fields";

export function SpecificationOptionRow({
  option,
  optionIndex,
  index,
  specificationLocale,
  labels,
  optionError,
  clientValidationId,
  updateSpecification,
  setClientValidationId,
}: {
  option: SpecificationDraft["options"][number];
  optionIndex: number;
  index: number;
  specificationLocale: CatalogLocale;
  labels: CatalogLabels;
  optionError: boolean;
  clientValidationId: string | null;
  updateSpecification: (
    index: number,
    update: (current: SpecificationDraft) => SpecificationDraft,
  ) => void;
  setClientValidationId: (value: string | null) => void;
}) {
  const optionId =
    "specification-option-" + option.clientId + "-" + specificationLocale;
  return (
    <div className="dashboard-catalog-option">
      <Field
        id={optionId}
        copy={labels.specifications.optionName}
        count={
          <CharacterCount
            value={option.labels[specificationLocale]}
            maximum={200}
          />
        }
        error={optionError ? labels.validation.required : undefined}
      >
        <input
          id={optionId}
          value={option.labels[specificationLocale]}
          onChange={(event) => {
            if (clientValidationId === optionId) {
              setClientValidationId(null);
            }
            updateSpecification(index, (current) => ({
              ...current,
              options: current.options.map((candidate, candidateIndex) =>
                candidateIndex === optionIndex
                  ? {
                      ...candidate,
                      labels: {
                        ...candidate.labels,
                        [specificationLocale]: event.target.value,
                      },
                    }
                  : candidate,
              ),
            }));
          }}
          required
          maxLength={200}
          aria-describedby={`${optionId}-help${optionError ? ` ${optionId}-error` : ""}`}
          aria-invalid={optionError ? true : undefined}
        />
      </Field>
      <DashboardButton
        type="button"
        onClick={() =>
          updateSpecification(index, (current) => ({
            ...current,
            options: current.options.filter(
              (_, candidateIndex) => candidateIndex !== optionIndex,
            ),
          }))
        }
      >
        {labels.specifications.removeOption}
      </DashboardButton>
    </div>
  );
}
