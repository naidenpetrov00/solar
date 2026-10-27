import { DashboardButton } from "./product-editor-draft";
import type { ProductSpecificationSectionProps } from "./product-specification-model";
import { ProductCustomSpecificationFields } from "./product-custom-specification-fields";
import { ProductCustomSpecificationOptions } from "./product-custom-specification-options";
import { ProductCustomSpecificationValue } from "./product-custom-specification-value";

export function ProductCustomSpecificationItem({
  specification,
  index,
  props,
}: {
  specification: ProductSpecificationSectionProps["customSpecifications"][number];
  index: number;
  props: ProductSpecificationSectionProps;
}) {
  const { labels, setCustomSpecifications, markDirty } = props;
  return (
    <section
      key={specification.id}
      className="dashboard-catalog-custom-specification"
      aria-labelledby={`custom-spec-${specification.id}-title`}
    >
      <div className="dashboard-catalog-product-specification-heading">
        <h3 id={`custom-spec-${specification.id}-title`}>
          {labels.specifications.customTitle} {index + 1}
        </h3>
        <DashboardButton
          type="button"
          onClick={() => {
            setCustomSpecifications((current) =>
              current.filter(({ id }) => id !== specification.id),
            );
            markDirty("specifications");
          }}
        >
          {labels.specifications.removeCustom}
        </DashboardButton>
      </div>
      <p>{labels.specifications.customHelp}</p>
      <ProductCustomSpecificationFields
        specification={specification}
        props={props}
      />
      <ProductCustomSpecificationOptions
        specification={specification}
        props={props}
      />
      <ProductCustomSpecificationValue
        specification={specification}
        props={props}
      />
    </section>
  );
}
