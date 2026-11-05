import { DashboardButton } from "./product-editor-draft";
import { ProductInheritedSpecificationItem } from "./product-inherited-specification-item";
import type { ProductSpecificationSectionProps } from "./product-specification-model";

export function ProductInheritedSpecifications({
  props,
}: {
  props: ProductSpecificationSectionProps;
}) {
  const {
    labels,
    locale,
    visibleInheritedSpecifications,
    removedInheritedSpecifications,
    setExcludedSpecificationIds,
    markDirty,
  } = props;
  return (
    <>
      {visibleInheritedSpecifications.map((specification) => (
        <ProductInheritedSpecificationItem
          key={specification.id}
          specification={specification}
          props={props}
        />
      ))}
      {removedInheritedSpecifications.length ? (
        <div className="dashboard-catalog-removed-specifications">
          <strong>{labels.specifications.removed}</strong>
          {removedInheritedSpecifications.map((specification) => (
            <DashboardButton
              key={specification.id}
              type="button"
              onClick={() => {
                setExcludedSpecificationIds((current) =>
                  current.filter((id) => id !== specification.id),
                );
                markDirty("specifications");
              }}
            >
              {labels.specifications.restoreInherited}:{" "}
              {specification.translations.find((item) => item.locale === locale)
                ?.label ?? specification.key}
            </DashboardButton>
          ))}
        </div>
      ) : null}
    </>
  );
}
