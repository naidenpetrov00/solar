import type { CatalogLabels } from "./catalog-labels";
import { slugErrorLabel } from "./catalog-editor-actions";
import { Field } from "./catalog-editor-fields";

type SlugField = "bgSlug" | "enSlug";

export function NewCategoryGeneral({
  parentName,
  labels,
  bgSlug,
  enSlug,
  errors,
  onSlugChange,
}: {
  parentName: string;
  labels: CatalogLabels;
  bgSlug: string;
  enSlug: string;
  errors: Record<string, string>;
  onSlugChange: (field: SlugField, value: string) => void;
}) {
  return (
    <section className="dashboard-catalog-create-section">
      <h3>{labels.sections.general}</h3>
      <dl className="dashboard-catalog-facts">
        <div>
          <dt>{labels.fields.parent.label}</dt>
          <dd>{parentName}</dd>
        </div>
      </dl>
      <div className="dashboard-catalog-slug-grid">
        {(["bgSlug", "enSlug"] as const).map((field) => (
          <Field
            key={field}
            id={`catalog-create-${field}`}
            copy={labels.fields[field]}
            error={slugErrorLabel(errors[field], labels)}
          >
            <input
              id={`catalog-create-${field}`}
              name={field}
              autoFocus={field === "bgSlug"}
              value={field === "bgSlug" ? bgSlug : enSlug}
              onChange={(event) => onSlugChange(field, event.target.value)}
              required
              maxLength={120}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              aria-describedby={`catalog-create-${field}-help`}
              aria-invalid={errors[field] ? true : undefined}
            />
          </Field>
        ))}
      </div>
    </section>
  );
}
