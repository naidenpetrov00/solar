import { catalogLocales } from "@/lib/catalog/model";
import { Field, fieldAria } from "./product-editor-fields";
import type { ProductGeneralSectionProps } from "./product-general-model";
export function ProductGeneralIdentity({
  props,
}: {
  props: ProductGeneralSectionProps;
}) {
  const {
    detail,
    labels,
    titleGuidance,
    editorDisabled,
    mpnError,
    bgTitleError,
    updateTranslation,
    markDirty,
    activeLocale,
    translations,
    brand,
    setBrand,
    mpn,
    setMpn,
  } = props;
  return (
    <fieldset
      disabled={editorDisabled}
      className="dashboard-catalog-product-fieldset"
      onChange={() => markDirty("general")}
    >
      <div className="dashboard-catalog-product-title-editor">
        {catalogLocales.map((contentLocale) => {
          const values = translations[contentLocale];
          const guidance =
            titleGuidance.find((item) => item.locale === contentLocale)
              ?.value ??
            titleGuidance.find((item) => item.locale === "bg")?.value;
          const titleError = contentLocale === "bg" ? bgTitleError : undefined;

          return (
            <div key={contentLocale} hidden={activeLocale !== contentLocale}>
              <Field
                id={`catalog-product-title-${contentLocale}`}
                copy={labels.fields.title}
                error={titleError}
              >
                <input
                  id={`catalog-product-title-${contentLocale}`}
                  name={`content.${contentLocale}.title`}
                  value={values.title}
                  onChange={(event) =>
                    updateTranslation(
                      contentLocale,
                      "title",
                      event.target.value,
                    )
                  }
                  required={contentLocale === "bg"}
                  maxLength={200}
                  {...fieldAria(
                    `catalog-product-title-${contentLocale}`,
                    titleError,
                  )}
                />
              </Field>
              <aside className="dashboard-catalog-title-guidance">
                <strong>{labels.content.titleGuidance}</strong>
                <p>{guidance || labels.content.titleStructure}</p>
                {guidance ? (
                  <small>{labels.content.titleStructure}</small>
                ) : null}
              </aside>
            </div>
          );
        })}
      </div>
      <div className="dashboard-catalog-product-form-grid">
        <Field id="catalog-product-sku" copy={labels.fields.sku}>
          <input
            id="catalog-product-sku"
            value={detail?.sku ?? labels.editor.skuPending}
            readOnly
            aria-describedby="catalog-product-sku-help"
          />
        </Field>
        <Field id="catalog-product-brand" copy={labels.fields.brand}>
          <input
            id="catalog-product-brand"
            name="brand"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            maxLength={120}
            aria-describedby="catalog-product-brand-help"
          />
        </Field>
        <Field
          id="catalog-product-mpn"
          copy={labels.fields.mpn}
          error={mpnError}
        >
          <input
            id="catalog-product-mpn"
            name="mpn"
            value={mpn}
            onChange={(event) => setMpn(event.target.value)}
            required
            maxLength={100}
            {...fieldAria("catalog-product-mpn", mpnError)}
          />
        </Field>
      </div>
    </fieldset>
  );
}
