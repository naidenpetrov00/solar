import { type CatalogLocale } from "@/lib/catalog/model";
import { Field } from "./product-editor-fields";
import { ProductContentSlugField } from "./product-content-slug-field";
import { productPublicPath } from "./product-category-paths";
import { ProductContentSeoFields } from "./product-content-seo-fields";
import type { ProductContentSectionProps } from "./product-content-model";
export function ProductContentLocalePanel({
  contentLocale,
  props,
}: {
  contentLocale: CatalogLocale;
  props: ProductContentSectionProps;
}) {
  const {
    labels,
    editorDisabled,
    updateTranslation,
    activeLocale,
    translations,
    bgSlug,
    enSlug,
    trSlug,
    ukSlug,
  } = props;

  const values = translations[contentLocale];
  const prefix = `content.${contentLocale}`;
  const previewPath = productPublicPath(
    contentLocale,
    bgSlug,
    enSlug,
    trSlug || null,
    ukSlug || null,
  );

  return (
    <div
      key={contentLocale}
      id={`product-content-panel-${contentLocale}`}
      role="tabpanel"
      aria-labelledby={`product-content-language-${contentLocale}`}
      hidden={activeLocale !== contentLocale}
      className="dashboard-catalog-language-panel"
    >
      <fieldset
        disabled={editorDisabled}
        className="dashboard-catalog-product-fieldset"
      >
        <ProductContentSlugField
          contentLocale={contentLocale}
          previewPath={previewPath}
          props={props}
        />
        <Field
          id={`product-content-${contentLocale}-marketing-label`}
          copy={labels.fields.marketingLabel}
        >
          <input
            id={`product-content-${contentLocale}-marketing-label`}
            name={`${prefix}.marketingLabel`}
            value={values.marketingLabel}
            onChange={(event) =>
              updateTranslation(
                contentLocale,
                "marketingLabel",
                event.target.value,
              )
            }
            maxLength={200}
            aria-describedby={`product-content-${contentLocale}-marketing-label-help`}
          />
        </Field>
        <Field
          id={`product-content-${contentLocale}-short`}
          copy={labels.fields.shortDescription}
        >
          <textarea
            id={`product-content-${contentLocale}-short`}
            name={`${prefix}.shortDescription`}
            value={values.shortDescription}
            onChange={(event) =>
              updateTranslation(
                contentLocale,
                "shortDescription",
                event.target.value,
              )
            }
            rows={3}
            maxLength={2000}
            aria-describedby={`product-content-${contentLocale}-short-help`}
          />
        </Field>
        <Field
          id={`product-content-${contentLocale}-full`}
          copy={labels.fields.fullDescription}
        >
          <textarea
            id={`product-content-${contentLocale}-full`}
            name={`${prefix}.fullDescription`}
            value={values.fullDescription}
            onChange={(event) =>
              updateTranslation(
                contentLocale,
                "fullDescription",
                event.target.value,
              )
            }
            rows={8}
            maxLength={50000}
            aria-describedby={`product-content-${contentLocale}-full-help`}
          />
        </Field>
        <ProductContentSeoFields
          contentLocale={contentLocale}
          previewPath={previewPath}
          props={props}
        />
      </fieldset>
    </div>
  );
}
