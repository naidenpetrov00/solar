import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import { CategorySelector } from "./product-category-selector";
import { CommerceFields } from "./product-commerce-fields";
import { ProductGeneralIdentity } from "./product-general-identity";
import type { ProductGeneralSectionProps } from "./product-general-model";
export function ProductGeneralSection(props: ProductGeneralSectionProps) {
  const {
    labels,
    languages,
    categories,
    editorDisabled,
    categoryError,
    errors,
    markDirty,
    setPrimary,
    activeLocale,
    setActiveLocale,
    translations,
    primaryCategoryId,
    additionalCategoryIds,
    setAdditionalCategoryIds,
    salesMode,
    setSalesMode,
    presentation,
    setPresentation,
    basis,
    setBasis,
    price,
    setPrice,
    availability,
    setAvailability,
  } = props;
  return (
    <details className="dashboard-catalog-section" open>
      <summary>{labels.sections.general}</summary>
      <LocalizedEditorSwitch
        idPrefix="product-title"
        variant="selector"
        activeLocale={activeLocale}
        onChange={setActiveLocale}
        languageNames={languages}
        statusByLocale={
          Object.fromEntries(
            catalogLocales.map((contentLocale) => [
              contentLocale,
              Boolean(translations[contentLocale].title.trim()),
            ]),
          ) as Record<CatalogLocale, boolean>
        }
        completeLabel={labels.editor.complete}
        incompleteLabel={labels.editor.incomplete}
        ariaLabel={labels.fields.title.label}
      />
      <ProductGeneralIdentity props={props} />
      <CategorySelector
        categories={categories}
        primaryCategoryId={primaryCategoryId}
        additionalCategoryIds={additionalCategoryIds}
        setPrimary={setPrimary}
        toggleAdditional={(id) => {
          setAdditionalCategoryIds((current) =>
            current.includes(id)
              ? current.filter((candidate) => candidate !== id)
              : [...current, id],
          );
          markDirty("general");
        }}
        labels={labels}
        disabled={editorDisabled}
        error={categoryError}
      />
      <fieldset
        disabled={editorDisabled}
        className="dashboard-catalog-product-fieldset"
        onChange={() => markDirty("general")}
      >
        <CommerceFields
          salesMode={salesMode}
          setSalesMode={setSalesMode}
          presentation={presentation}
          setPresentation={setPresentation}
          basis={basis}
          setBasis={setBasis}
          price={price}
          setPrice={setPrice}
          availability={availability}
          setAvailability={setAvailability}
          labels={labels}
          errors={errors}
          disabled={editorDisabled}
        />
      </fieldset>
    </details>
  );
}
