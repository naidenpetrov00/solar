import type { CatalogLocale } from "@/lib/catalog/model";
import { DashboardButton, safeSlug } from "./product-editor-draft";
import { Field, fieldAria } from "./product-editor-fields";
import type { ProductContentSectionProps } from "./product-content-model";
export function ProductContentSlugField({
  contentLocale,
  previewPath,
  props,
}: {
  contentLocale: CatalogLocale;
  previewPath: string;
  props: ProductContentSectionProps;
}) {
  const {
    detail,
    labels,
    origin,
    creating,
    productSlugs,
    slugErrors,
    slugCopyByLocale,
    slugAutoManaged,
    updateProductSlug,
    translations,
  } = props;
  const values = translations[contentLocale];
  const requiredSlug = contentLocale === "bg" || contentLocale === "en";
  const localizedSlug = productSlugs[contentLocale];
  const slugId = `catalog-product-${contentLocale}-slug`;
  const slugCopy = slugCopyByLocale[contentLocale];
  const localizedSlugError = slugErrors[contentLocale];
  const suggestedSlug = safeSlug(
    values.title || (contentLocale === "en" ? translations.bg.title : ""),
  );
  const canOfferSlugUpdate =
    !detail?.publishedAt &&
    slugAutoManaged[contentLocale] &&
    Boolean(suggestedSlug) &&
    suggestedSlug !== localizedSlug &&
    (!creating || !requiredSlug);

  return (
    <>
      <Field id={slugId} copy={slugCopy} error={localizedSlugError}>
        <input
          id={slugId}
          name={`${contentLocale}Slug`}
          value={localizedSlug}
          readOnly={Boolean(detail?.publishedAt)}
          onChange={(event) =>
            updateProductSlug(contentLocale, event.target.value, true)
          }
          required={requiredSlug}
          maxLength={120}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          {...fieldAria(slugId, localizedSlugError)}
        />
        <code className="dashboard-catalog-url-preview">
          {origin}
          {previewPath}
        </code>
        {canOfferSlugUpdate ? (
          <DashboardButton
            type="button"
            className="dashboard-catalog-slug-update"
            onClick={() =>
              updateProductSlug(contentLocale, suggestedSlug, false)
            }
          >
            {labels.content.updateSlug}
          </DashboardButton>
        ) : null}
      </Field>
    </>
  );
}
