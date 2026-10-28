import { ButtonLink } from "@/components/button";
import type { ProductSpecificationSectionProps } from "./product-specification-model";
import { ProductInheritedSpecifications } from "./product-inherited-specifications";

export function ProductSpecificationSection(
  props: ProductSpecificationSectionProps,
) {
  const {
    labels,
    editorDisabled,
    markDirty,
    initialPrimaryCategoryId,
    visibleInheritedSpecifications,
    removedInheritedSpecifications,
    primaryCategoryId,
    catalogPath,
  } = props;
  const hasSpecifications =
    visibleInheritedSpecifications.length > 0 ||
    removedInheritedSpecifications.length > 0;

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
        {!hasSpecifications ? <p>{labels.specifications.empty}</p> : null}
        <ProductInheritedSpecifications props={props} />
        <ButtonLink
          variant="informational"
          href={`${catalogPath}?category=${encodeURIComponent(primaryCategoryId)}&view=category#catalog-category-specifications`}
        >
          {labels.specifications.manageCategory}
        </ButtonLink>
      </fieldset>
    </details>
  );
}
