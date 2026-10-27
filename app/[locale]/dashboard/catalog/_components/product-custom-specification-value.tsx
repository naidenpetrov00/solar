import { DashboardSelect } from "../../_components/dashboard-select";
import { customScalarValue } from "./product-editor-draft";
import { Field } from "./product-editor-fields";
import type { ProductCustomSpecificationProps } from "./product-specification-model";
export function ProductCustomSpecificationValue({
  specification,
  props,
}: ProductCustomSpecificationProps) {
  const { labels, activeLocale, setCustomSpecifications } = props;
  return (
    <>
      <Field
        id={`custom-spec-${specification.id}-value`}
        copy={labels.specifications.customValue}
      >
        {specification.valueType === "text" ||
        specification.valueType === "number" ? (
          <input
            id={`custom-spec-${specification.id}-value`}
            inputMode={
              specification.valueType === "number" ? "decimal" : undefined
            }
            value={customScalarValue(specification.value)}
            onChange={(event) =>
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? {
                        ...item,
                        value: event.target.value
                          ? {
                              type: specification.valueType as
                                "text" | "number",
                              value: event.target.value,
                            }
                          : null,
                      }
                    : item,
                ),
              )
            }
            aria-describedby={`custom-spec-${specification.id}-value-help`}
          />
        ) : specification.valueType === "boolean" ? (
          <DashboardSelect
            id={`custom-spec-${specification.id}-value`}
            value={
              specification.value?.type === "boolean"
                ? String(specification.value.value)
                : ""
            }
            onChange={(event) =>
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? {
                        ...item,
                        value:
                          event.target.value === ""
                            ? null
                            : {
                                type: "boolean",
                                value: event.target.value === "true",
                              },
                      }
                    : item,
                ),
              )
            }
            aria-describedby={`custom-spec-${specification.id}-value-help`}
          >
            <option value="">{labels.specifications.choose}</option>
            <option value="true">{labels.specifications.yes}</option>
            <option value="false">{labels.specifications.no}</option>
          </DashboardSelect>
        ) : (
          <DashboardSelect
            id={`custom-spec-${specification.id}-value`}
            value={
              specification.value?.type === "selection"
                ? specification.value.optionId
                : ""
            }
            onChange={(event) =>
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? {
                        ...item,
                        value: event.target.value
                          ? { type: "selection", optionId: event.target.value }
                          : null,
                      }
                    : item,
                ),
              )
            }
            aria-describedby={`custom-spec-${specification.id}-value-help`}
          >
            <option value="">{labels.specifications.choose}</option>
            {specification.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.labels[activeLocale] ||
                  option.labels.bg ||
                  labels.specifications.customOption.label}
              </option>
            ))}
          </DashboardSelect>
        )}
      </Field>
    </>
  );
}
