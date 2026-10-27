import { DashboardButton, emptyLocalizedText } from "./product-editor-draft";
import { Field } from "./product-editor-fields";
import type { ProductCustomSpecificationProps } from "./product-specification-model";
export function ProductCustomSpecificationOptions({
  specification,
  props,
}: ProductCustomSpecificationProps) {
  const { labels, activeLocale, setCustomSpecifications, markDirty } = props;
  return (
    <>
      {specification.valueType === "selection" ? (
        <div className="dashboard-catalog-custom-options">
          {specification.options.map((option) => (
            <div key={option.id}>
              <Field
                id={`custom-option-${option.id}`}
                copy={labels.specifications.customOption}
              >
                <input
                  id={`custom-option-${option.id}`}
                  value={option.labels[activeLocale]}
                  onChange={(event) =>
                    setCustomSpecifications((current) =>
                      current.map((item) =>
                        item.id === specification.id
                          ? {
                              ...item,
                              options: item.options.map((candidate) =>
                                candidate.id === option.id
                                  ? {
                                      ...candidate,
                                      labels: {
                                        ...candidate.labels,
                                        [activeLocale]: event.target.value,
                                      },
                                    }
                                  : candidate,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  aria-describedby={`custom-option-${option.id}-help`}
                />
              </Field>
              <DashboardButton
                type="button"
                onClick={() => {
                  setCustomSpecifications((current) =>
                    current.map((item) =>
                      item.id === specification.id
                        ? {
                            ...item,
                            options: item.options.filter(
                              ({ id }) => id !== option.id,
                            ),
                            value:
                              item.value?.type === "selection" &&
                              item.value.optionId === option.id
                                ? null
                                : item.value,
                          }
                        : item,
                    ),
                  );
                  markDirty("specifications");
                }}
              >
                {labels.specifications.removeOption}
              </DashboardButton>
            </div>
          ))}
          <DashboardButton
            type="button"
            onClick={() => {
              setCustomSpecifications((current) =>
                current.map((item) =>
                  item.id === specification.id
                    ? {
                        ...item,
                        options: [
                          ...item.options,
                          {
                            id: crypto.randomUUID(),
                            labels: emptyLocalizedText(),
                          },
                        ],
                      }
                    : item,
                ),
              );
              markDirty("specifications");
            }}
          >
            {labels.specifications.addOption}
          </DashboardButton>
        </div>
      ) : null}
    </>
  );
}
