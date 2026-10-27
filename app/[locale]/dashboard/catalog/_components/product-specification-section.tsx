import { DashboardButton, emptyLocalizedText } from "./product-editor-draft";
import type { ProductSpecificationSectionProps } from "./product-specification-model";
import { ProductInheritedSpecifications } from "./product-inherited-specifications";
import { ProductCustomSpecificationItem } from "./product-custom-specification-item";

export function ProductSpecificationSection(
  props: ProductSpecificationSectionProps,
) {
  const {
    labels,
    editorDisabled,
    markDirty,
    initialPrimaryCategoryId,
    visibleInheritedSpecifications,
    primaryCategoryId,
    customSpecifications,
    setCustomSpecifications,
  } = props;
  return (
    <details className="dashboard-catalog-section" open>
      <summary>{labels.sections.specifications}</summary>
      <fieldset
        disabled={editorDisabled}
        className="dashboard-catalog-product-fieldset dashboard-catalog-product-specifications"
        onChange={() => markDirty("specifications")}
      >
        {primaryCategoryId !== initialPrimaryCategoryId ? (
          <p>{labels.specifications.categoryChangePending}</p>
        ) : null}
        {visibleInheritedSpecifications.length === 0 &&
        customSpecifications.length === 0 ? (
          <p>{labels.specifications.empty}</p>
        ) : null}
        <ProductInheritedSpecifications props={props} />
        {customSpecifications.map((specification, index) => (
          <ProductCustomSpecificationItem
            key={specification.id}
            specification={specification}
            index={index}
            props={props}
          />
        ))}
        <DashboardButton
          type="button"
          onClick={() => {
            setCustomSpecifications((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                valueType: "text",
                unit: null,
                displayOrder: current.length,
                labels: emptyLocalizedText(),
                options: [],
                value: null,
              },
            ]);
            markDirty("specifications");
          }}
        >
          {labels.specifications.addCustom}
        </DashboardButton>
      </fieldset>
    </details>
  );
}
