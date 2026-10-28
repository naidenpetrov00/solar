"use client";

import { type ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import type { CatalogActionResult } from "../category-action-model";
import { type CatalogLabels } from "./catalog-labels";
import { serializeSpecifications } from "./catalog-specification-draft";
import { DashboardButton, emptyLocaleLabels } from "./catalog-editor-actions";
import { ResultMessage } from "./catalog-editor-fields";
import { CatalogSectionSaveState } from "./catalog-section-save-state";
import { ProductCharacteristicsPreview } from "./catalog-characteristics-preview";
import { firstInvalidSpecification } from "./catalog-specification-validation";
import { useSpecificationEditor } from "./use-specification-editor";
import { SpecificationItem } from "./catalog-specification-item";
import { SpecificationLanguage } from "./catalog-specification-language";

export function SpecificationEditor({
  detail,
  labels,
  disabled,
  isDirty,
  onDirty,
  result,
  action,
  pending,
  onReload,
  locale,
}: {
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
  disabled: boolean;
  isDirty: boolean;
  onDirty: () => void;
  result: CatalogActionResult;
  action: (payload: FormData) => void;
  pending: boolean;
  onReload: () => void;
  locale: string;
}) {
  const {
    specifications,
    setSpecifications,
    specificationLocale,
    setSpecificationLocale,
    expanded,
    setExpanded,
    setPendingFocusId,
    clientValidationId,
    setClientValidationId,
    dismissedServerErrors,
    setDismissedServerErrors,
    updateSpecification,
    move,
    toggleExpanded,
  } = useSpecificationEditor(detail, result, onDirty);

  return (
    <form
      action={action}
      aria-busy={pending}
      onSubmit={(event) => {
        const invalid = firstInvalidSpecification(
          specifications,
          specificationLocale,
        );
        if (!invalid) return;
        event.preventDefault();
        setSpecificationLocale(invalid.locale);
        setExpanded((current) =>
          new Set(current).add(invalid.specification.clientId),
        );
        setClientValidationId(invalid.targetId);
        setPendingFocusId(invalid.targetId);
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="categoryId" value={detail.id} />
      <input type="hidden" name="expectedUpdatedAt" value={detail.updatedAt} />
      <input
        type="hidden"
        name="specifications"
        value={serializeSpecifications(specifications)}
      />
      <SpecificationLanguage
        labels={labels}
        specifications={specifications}
        activeLocale={specificationLocale}
        onChange={setSpecificationLocale}
      />
      <CatalogSectionSaveState
        id="catalog-category-specifications-save-state"
        isDirty={isDirty}
        pending={pending}
        result={result}
        copy={labels.saveState}
      />
      <div className="dashboard-catalog-specification-workspace">
        <div className="dashboard-catalog-specification-editor-column">
          {specifications.length === 0 ? (
            <div className="dashboard-catalog-specifications-empty">
              <strong>{labels.specifications.empty}</strong>
              <p>{labels.specifications.emptyDescription}</p>
            </div>
          ) : (
            <div className="dashboard-catalog-specification-list">
              {specifications.map((specification, index) => (
                <SpecificationItem
                  key={specification.clientId}
                  specification={specification}
                  index={index}
                  specificationsLength={specifications.length}
                  isExpanded={expanded.has(specification.clientId)}
                  specificationLocale={specificationLocale}
                  labels={labels}
                  disabled={disabled}
                  clientValidationId={clientValidationId}
                  dismissedServerErrors={dismissedServerErrors}
                  result={result}
                  toggleExpanded={toggleExpanded}
                  move={move}
                  onRemove={(index) => {
                    setSpecifications((current) =>
                      current.filter(
                        (_, candidateIndex) => candidateIndex !== index,
                      ),
                    );
                    onDirty();
                  }}
                  updateSpecification={updateSpecification}
                  setClientValidationId={setClientValidationId}
                  setDismissedServerErrors={setDismissedServerErrors}
                  setSpecificationLocale={setSpecificationLocale}
                  setPendingFocusId={setPendingFocusId}
                />
              ))}
            </div>
          )}
          {!disabled ? (
            <div className="dashboard-catalog-form-actions">
              <DashboardButton
                type="button"
                onClick={() => {
                  setDismissedServerErrors(true);
                  const clientId = crypto.randomUUID();
                  setSpecificationLocale("bg");
                  setExpanded((current) => new Set(current).add(clientId));
                  setSpecifications((current) => [
                    ...current,
                    {
                      clientId,
                      persistedId: null,
                      valueType: "text",
                      unit: "",
                      isRequired: false,
                      isFilterable: true,
                      labels: emptyLocaleLabels(),
                      options: [],
                    },
                  ]);
                  setPendingFocusId(`specification-name-${clientId}-bg`);
                  onDirty();
                }}
              >
                {labels.specifications.add}
              </DashboardButton>
              <DashboardButton
                type="submit"
                disabled={!isDirty || pending}
                aria-describedby="catalog-category-specifications-save-state"
              >
                {pending ? labels.actions.saving : labels.actions.save}
              </DashboardButton>
            </div>
          ) : null}
          {result.status === "error" ? (
            <ResultMessage result={result} labels={labels} onReload={onReload} />
          ) : null}
        </div>
        <ProductCharacteristicsPreview
          specifications={specifications}
          labels={labels}
          activeLocale={specificationLocale}
        />
      </div>
    </form>
  );
}
