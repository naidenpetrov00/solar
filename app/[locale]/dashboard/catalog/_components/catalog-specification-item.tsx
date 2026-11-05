import type { CatalogLocale } from "@/lib/catalog/model";
import type { CatalogActionResult } from "../category-action-model";
import type { CatalogLabels } from "./catalog-labels";
import type { SpecificationDraft } from "./catalog-editor-model";
import { localizedSpecificationValue } from "./catalog-specification-draft";
import { SpecificationOptions } from "./catalog-specification-options";
import { SpecificationFields } from "./catalog-specification-fields";
import { SpecificationItemHeader } from "./catalog-specification-item-header";

export function SpecificationItem({
  specification,
  index,
  specificationsLength,
  isExpanded,
  specificationLocale,
  labels,
  disabled,
  clientValidationId,
  dismissedServerErrors,
  result,
  toggleExpanded,
  move,
  onRemove,
  updateSpecification,
  setClientValidationId,
  setDismissedServerErrors,
  setSpecificationLocale,
  setPendingFocusId,
}: {
  specification: SpecificationDraft;
  index: number;
  specificationsLength: number;
  isExpanded: boolean;
  specificationLocale: CatalogLocale;
  labels: CatalogLabels;
  disabled: boolean;
  clientValidationId: string | null;
  dismissedServerErrors: boolean;
  result: CatalogActionResult;
  toggleExpanded: (clientId: string) => void;
  move: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  updateSpecification: (
    index: number,
    update: (current: SpecificationDraft) => SpecificationDraft,
  ) => void;
  setClientValidationId: (value: string | null) => void;
  setDismissedServerErrors: (value: boolean) => void;
  setSpecificationLocale: (locale: CatalogLocale) => void;
  setPendingFocusId: (value: string | null) => void;
}) {
  const displayName =
    localizedSpecificationValue(specification.labels, specificationLocale) ||
    `${labels.specifications.item} ${index + 1}`;
  const panelId = `specification-panel-${specification.clientId}`;
  const nameId = `specification-name-${specification.clientId}-${specificationLocale}`;
  const nameError = Boolean(
    clientValidationId === nameId ||
    (!dismissedServerErrors &&
      result.fieldErrors?.[
        `specifications.${index}.translations.${specificationLocale}`
      ]),
  );
  const optionsError = Boolean(
    (!dismissedServerErrors &&
      result.fieldErrors?.[`specifications.${index}.options`]) ||
    clientValidationId === `specification-add-option-${specification.clientId}`,
  );

  return (
    <section className="dashboard-catalog-specification">
      <SpecificationItemHeader
        specification={specification}
        index={index}
        specificationsLength={specificationsLength}
        isExpanded={isExpanded}
        displayName={displayName}
        labels={labels}
        disabled={disabled}
        panelId={panelId}
        toggleExpanded={toggleExpanded}
        move={move}
        onRemove={onRemove}
      />
      {isExpanded ? (
        <div id={panelId} className="dashboard-catalog-specification-body">
          <fieldset disabled={disabled}>
            <SpecificationFields
              specification={specification}
              index={index}
              specificationLocale={specificationLocale}
              labels={labels}
              nameId={nameId}
              nameError={nameError}
              clientValidationId={clientValidationId}
              updateSpecification={updateSpecification}
              setClientValidationId={setClientValidationId}
            />
            {specification.valueType === "selection" ? (
              <SpecificationOptions
                specification={specification}
                index={index}
                specificationLocale={specificationLocale}
                labels={labels}
                optionsError={optionsError}
                clientValidationId={clientValidationId}
                dismissedServerErrors={dismissedServerErrors}
                result={result}
                updateSpecification={updateSpecification}
                setDismissedServerErrors={setDismissedServerErrors}
                setClientValidationId={setClientValidationId}
                setSpecificationLocale={setSpecificationLocale}
                setPendingFocusId={setPendingFocusId}
              />
            ) : null}
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
