import type { CatalogLocale } from "@/lib/catalog/model";
import type {
  ProductEditorSection,
  ProductTranslationDraft,
} from "./product-editor-model";
import { safeSlug } from "./product-editor-draft";
import type { useProductDraft } from "./use-product-draft";

type ContentDraft = Pick<
  ReturnType<typeof useProductDraft>,
  | "translations"
  | "setTranslations"
  | "bgSlug"
  | "setBgSlug"
  | "enSlug"
  | "setEnSlug"
  | "trSlug"
  | "setTrSlug"
  | "ukSlug"
  | "setUkSlug"
  | "bgSlugAutoManaged"
  | "setBgSlugAutoManaged"
  | "enSlugAutoManaged"
  | "setEnSlugAutoManaged"
  | "trSlugAutoManaged"
  | "setTrSlugAutoManaged"
  | "ukSlugAutoManaged"
  | "setUkSlugAutoManaged"
>;

export function useProductContent(
  draft: ContentDraft,
  creating: boolean,
  markDirty: (section: ProductEditorSection) => void,
) {
  const {
    translations,
    setTranslations,
    bgSlug,
    setBgSlug,
    enSlug,
    setEnSlug,
    trSlug,
    setTrSlug,
    ukSlug,
    setUkSlug,
    bgSlugAutoManaged,
    setBgSlugAutoManaged,
    enSlugAutoManaged,
    setEnSlugAutoManaged,
    trSlugAutoManaged,
    setTrSlugAutoManaged,
    ukSlugAutoManaged,
    setUkSlugAutoManaged,
  } = draft;

  const updateTranslation = (
    contentLocale: CatalogLocale,
    field: keyof ProductTranslationDraft,
    value: string,
  ) => {
    setTranslations((current) => ({
      ...current,
      [contentLocale]: { ...current[contentLocale], [field]: value },
    }));
    if (field === "title" && creating) {
      if (contentLocale === "bg") {
        if (bgSlugAutoManaged) setBgSlug(safeSlug(value));
        if (enSlugAutoManaged && !translations.en.title.trim())
          setEnSlug(safeSlug(value));
      }
      if (contentLocale === "en" && enSlugAutoManaged) {
        setEnSlug(safeSlug(value || translations.bg.title));
      }
    }
    markDirty(field === "title" ? "general" : "content");
  };

  const productSlugs: Record<CatalogLocale, string> = {
    bg: bgSlug,
    en: enSlug,
    tr: trSlug,
    uk: ukSlug,
  };
  const slugAutoManaged: Record<CatalogLocale, boolean> = {
    bg: bgSlugAutoManaged,
    en: enSlugAutoManaged,
    tr: trSlugAutoManaged,
    uk: ukSlugAutoManaged,
  };

  const updateProductSlug = (
    contentLocale: CatalogLocale,
    value: string,
    manual: boolean,
  ) => {
    if (contentLocale === "bg") {
      setBgSlug(value);
      if (manual) setBgSlugAutoManaged(false);
    } else if (contentLocale === "en") {
      setEnSlug(value);
      if (manual) setEnSlugAutoManaged(false);
    } else if (contentLocale === "tr") {
      setTrSlug(value);
      if (manual) setTrSlugAutoManaged(false);
    } else {
      setUkSlug(value);
      if (manual) setUkSlugAutoManaged(false);
    }
    markDirty("content");
  };

  return {
    updateTranslation,
    productSlugs,
    slugAutoManaged,
    updateProductSlug,
  };
}
