import type { CatalogLocale } from "@/lib/catalog/model";
import { Field } from "./product-editor-fields";
import type { ProductContentSectionProps } from "./product-content-model";
export function ProductContentSeoFields({
  contentLocale,
  previewPath,
  props,
}: {
  contentLocale: CatalogLocale;
  previewPath: string;
  props: ProductContentSectionProps;
}) {
  const { labels, origin, translations, updateTranslation } = props;
  const values = translations[contentLocale];
  const prefix = "content." + contentLocale;
  return (
    <>
      <div className="dashboard-catalog-seo-fields">
        <h3>{labels.content.seoGroup}</h3>
        <Field
          id={`product-content-${contentLocale}-seo-title`}
          copy={labels.fields.seoTitle}
        >
          <input
            id={`product-content-${contentLocale}-seo-title`}
            name={`${prefix}.seoTitle`}
            value={values.seoTitle}
            onChange={(event) =>
              updateTranslation(contentLocale, "seoTitle", event.target.value)
            }
            maxLength={200}
            aria-describedby={`product-content-${contentLocale}-seo-title-help`}
          />
        </Field>
        <Field
          id={`product-content-${contentLocale}-meta`}
          copy={labels.fields.metaDescription}
        >
          <textarea
            id={`product-content-${contentLocale}-meta`}
            name={`${prefix}.metaDescription`}
            value={values.metaDescription}
            onChange={(event) =>
              updateTranslation(
                contentLocale,
                "metaDescription",
                event.target.value,
              )
            }
            rows={3}
            maxLength={500}
            aria-describedby={`product-content-${contentLocale}-meta-help`}
          />
        </Field>
        <div className="dashboard-catalog-search-preview">
          <span>{labels.content.previewTitle}</span>
          <strong>
            {values.seoTitle ||
              values.title ||
              labels.content.emptyProductTitle}
          </strong>
          <small>
            {origin}
            {previewPath}
          </small>
          <p>
            {values.metaDescription ||
              values.shortDescription ||
              labels.content.emptyMetaDescription}
          </p>
          <em>{labels.content.previewNote}</em>
        </div>
      </div>
    </>
  );
}
