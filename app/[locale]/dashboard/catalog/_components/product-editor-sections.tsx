import { ProductGeneralSection } from "./product-general-section";
import { ProductSpecificationSection } from "./product-specification-section";
import { ProductContentSection } from "./product-content-section";
import { ProductMediaSection } from "./product-media-section";
import type { ProductEditorController } from "./use-product-editor-controller";
export function ProductEditorSections({
  editor,
}: {
  editor: ProductEditorController;
}) {
  const {
    props,
    detail,
    creating,
    draft,
    save,
    content,
    view,
    origin,
    setInheritedValue,
    setPrimary,
  } = editor;
  const { labels, locale, languages, categories } = props;
  const {
    activeLocale,
    setActiveLocale,
    brand,
    setBrand,
    mpn,
    setMpn,
    translations,
    bgSlug,
    enSlug,
    trSlug,
    ukSlug,
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
    specValues,
    setSpecValues,
    setExcludedSpecificationIds,
    customSpecifications,
    setCustomSpecifications,
    media,
    setMedia,
  } = draft;
  const { markDirty } = save;
  const {
    updateTranslation,
    productSlugs,
    slugAutoManaged,
    updateProductSlug,
  } = content;
  const {
    initialPrimaryCategoryId,
    visibleInheritedSpecifications,
    removedInheritedSpecifications,
    titleGuidance,
    contentComplete,
    errors,
    editorDisabled,
    slugErrors,
    slugCopyByLocale,
    mpnError,
    categoryError,
    bgTitleError,
  } = view;
  const localeEditor = {
    labels,
    languages,
    editorDisabled,
    activeLocale,
    setActiveLocale,
  };
  return (
    <>
      <ProductGeneralSection
        {...localeEditor}
        detail={detail}
        categories={categories}
        titleGuidance={titleGuidance}
        mpnError={mpnError}
        categoryError={categoryError}
        bgTitleError={bgTitleError}
        errors={errors}
        updateTranslation={updateTranslation}
        markDirty={markDirty}
        setPrimary={setPrimary}
        translations={translations}
        brand={brand}
        setBrand={setBrand}
        mpn={mpn}
        setMpn={setMpn}
        primaryCategoryId={primaryCategoryId}
        additionalCategoryIds={additionalCategoryIds}
        setAdditionalCategoryIds={setAdditionalCategoryIds}
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
      />

      <ProductSpecificationSection
        {...localeEditor}
        locale={locale}
        markDirty={markDirty}
        initialPrimaryCategoryId={initialPrimaryCategoryId}
        visibleInheritedSpecifications={visibleInheritedSpecifications}
        removedInheritedSpecifications={removedInheritedSpecifications}
        setInheritedValue={setInheritedValue}
        primaryCategoryId={primaryCategoryId}
        specValues={specValues}
        setSpecValues={setSpecValues}
        setExcludedSpecificationIds={setExcludedSpecificationIds}
        customSpecifications={customSpecifications}
        setCustomSpecifications={setCustomSpecifications}
      />

      <ProductContentSection
        {...localeEditor}
        detail={detail}
        origin={origin}
        creating={creating}
        contentComplete={contentComplete}
        productSlugs={productSlugs}
        slugErrors={slugErrors}
        slugCopyByLocale={slugCopyByLocale}
        slugAutoManaged={slugAutoManaged}
        updateProductSlug={updateProductSlug}
        updateTranslation={updateTranslation}
        translations={translations}
        bgSlug={bgSlug}
        enSlug={enSlug}
        trSlug={trSlug}
        ukSlug={ukSlug}
      />

      <ProductMediaSection
        {...localeEditor}
        markDirty={markDirty}
        media={media}
        setMedia={setMedia}
      />
    </>
  );
}
