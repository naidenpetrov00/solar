import { DashboardSelect } from "../../_components/dashboard-select";
import { DashboardButton } from "./product-editor-draft";
import type { ProductSpecificationSectionProps } from "./product-specification-model";

export function ProductInheritedSpecificationItem({
  specification,
  props,
}: {
  specification: ProductSpecificationSectionProps["visibleInheritedSpecifications"][number];
  props: ProductSpecificationSectionProps;
}) {
  const {
    labels,
    locale,
    specValues,
    setSpecValues,
    setExcludedSpecificationIds,
    markDirty,
    setInheritedValue,
  } = props;

  const label =
    specification.translations.find((item) => item.locale === locale)?.label ??
    specification.translations.find((item) => item.locale === "bg")?.label ??
    specification.key;
  const value = specValues.find(
    (item) => item.specificationId === specification.id,
  );
  return (
    <div
      key={specification.id}
      className="dashboard-catalog-product-specification"
    >
      <div className="dashboard-catalog-product-specification-heading">
        <label htmlFor={`product-spec-${specification.id}`}>
          {label}
          {specification.unit ? ` (${specification.unit})` : ""}
          {specification.isRequired ? (
            <small> {labels.specifications.required}</small>
          ) : null}
        </label>
        {!specification.isRequired ? (
          <DashboardButton
            type="button"
            onClick={() => {
              setExcludedSpecificationIds((current) => [
                ...current.filter((id) => id !== specification.id),
                specification.id,
              ]);
              setSpecValues((current) =>
                current.filter(
                  (item) => item.specificationId !== specification.id,
                ),
              );
              markDirty("specifications");
            }}
          >
            {labels.specifications.removeInherited}
          </DashboardButton>
        ) : null}
      </div>
      {specification.valueType === "text" ? (
        <input
          id={`product-spec-${specification.id}`}
          value={value?.type === "text" ? value.value : ""}
          onChange={(event) =>
            setInheritedValue(
              specification.id,
              event.target.value
                ? {
                    specificationId: specification.id,
                    type: "text",
                    value: event.target.value,
                  }
                : null,
            )
          }
        />
      ) : null}
      {specification.valueType === "number" ? (
        <input
          id={`product-spec-${specification.id}`}
          inputMode="decimal"
          value={value?.type === "number" ? value.value : ""}
          onChange={(event) =>
            setInheritedValue(
              specification.id,
              event.target.value
                ? {
                    specificationId: specification.id,
                    type: "number",
                    value: event.target.value,
                  }
                : null,
            )
          }
        />
      ) : null}
      {specification.valueType === "boolean" ? (
        <DashboardSelect
          id={`product-spec-${specification.id}`}
          value={value?.type === "boolean" ? String(value.value) : ""}
          onChange={(event) =>
            setInheritedValue(
              specification.id,
              event.target.value === ""
                ? null
                : {
                    specificationId: specification.id,
                    type: "boolean",
                    value: event.target.value === "true",
                  },
            )
          }
        >
          <option value="">{labels.specifications.choose}</option>
          <option value="true">{labels.specifications.yes}</option>
          <option value="false">{labels.specifications.no}</option>
        </DashboardSelect>
      ) : null}
      {specification.valueType === "selection" ? (
        <DashboardSelect
          id={`product-spec-${specification.id}`}
          value={value?.type === "selection" ? value.optionId : ""}
          onChange={(event) =>
            setInheritedValue(
              specification.id,
              event.target.value
                ? {
                    specificationId: specification.id,
                    type: "selection",
                    optionId: event.target.value,
                  }
                : null,
            )
          }
        >
          <option value="">{labels.specifications.choose}</option>
          {specification.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.translations.find((item) => item.locale === locale)
                ?.label ??
                option.translations.find((item) => item.locale === "bg")
                  ?.label ??
                option.code}
            </option>
          ))}
        </DashboardSelect>
      ) : null}
    </div>
  );
}
