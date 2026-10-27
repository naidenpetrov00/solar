import type { CatalogLocale } from "@/lib/catalog/model";
import type { CatalogActionResult } from "../category-action-model";
import type { CatalogLabels } from "./catalog-labels";
import type { SpecificationDraft } from "./catalog-editor-model";
import { DashboardButton, emptyLocaleLabels } from "./catalog-editor-actions";
import { SpecificationOptionRow } from "./catalog-specification-option-row";

export function SpecificationOptions({
  specification,
  index,
  specificationLocale,
  labels,
  optionsError,
  clientValidationId,
  dismissedServerErrors,
  result,
  updateSpecification,
  setDismissedServerErrors,
  setClientValidationId,
  setSpecificationLocale,
  setPendingFocusId,
}: {
  specification: SpecificationDraft;
  index: number;
  specificationLocale: CatalogLocale;
  labels: CatalogLabels;
  optionsError: boolean;
  clientValidationId: string | null;
  dismissedServerErrors: boolean;
  result: CatalogActionResult;
  updateSpecification: (
    index: number,
    update: (current: SpecificationDraft) => SpecificationDraft,
  ) => void;
  setDismissedServerErrors: (value: boolean) => void;
  setClientValidationId: (value: string | null) => void;
  setSpecificationLocale: (locale: CatalogLocale) => void;
  setPendingFocusId: (value: string | null) => void;
}) {
  return (
    <section className="dashboard-catalog-options">
      <div className="dashboard-catalog-options-heading">
        <div>
          <h4>{labels.specifications.options}</h4>
          <p>{labels.specifications.optionsHelp}</p>
        </div>
        <DashboardButton
          id={`specification-add-option-${specification.clientId}`}
          type="button"
          onClick={() => {
            setDismissedServerErrors(true);
            if (
              clientValidationId ===
              `specification-add-option-${specification.clientId}`
            ) {
              setClientValidationId(null);
            }
            const optionId = crypto.randomUUID();
            setSpecificationLocale("bg");
            updateSpecification(index, (current) => ({
              ...current,
              options: [
                ...current.options,
                {
                  clientId: optionId,
                  persistedId: null,
                  labels: emptyLocaleLabels(),
                },
              ],
            }));
            setPendingFocusId(`specification-option-${optionId}-bg`);
          }}
        >
          {labels.specifications.addOption}
        </DashboardButton>
      </div>
      {optionsError ? (
        <p className="dashboard-catalog-field-error" role="alert">
          {labels.validation.selectionOption}
        </p>
      ) : null}
      {specification.options.map((option, optionIndex) => {
        const optionId =
          "specification-option-" + option.clientId + "-" + specificationLocale;
        const optionError = Boolean(
          clientValidationId === optionId ||
          (!dismissedServerErrors &&
            result.fieldErrors?.[
              "specifications." +
                index +
                ".options." +
                optionIndex +
                ".translations." +
                specificationLocale
            ]),
        );
        return (
          <SpecificationOptionRow
            key={option.clientId}
            option={option}
            optionIndex={optionIndex}
            index={index}
            specificationLocale={specificationLocale}
            labels={labels}
            optionError={optionError}
            clientValidationId={clientValidationId}
            updateSpecification={updateSpecification}
            setClientValidationId={setClientValidationId}
          />
        );
      })}
    </section>
  );
}
