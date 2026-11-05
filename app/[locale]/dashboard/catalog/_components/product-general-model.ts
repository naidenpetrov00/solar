import type { CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type {
  Props,
  ProductEditorSection,
  ProductTranslationDraft,
} from "./product-editor-model";
import type { useProductDraft } from "./use-product-draft";

type GeneralDraft = Pick<
  ReturnType<typeof useProductDraft>,
  | "activeLocale"
  | "setActiveLocale"
  | "translations"
  | "brand"
  | "setBrand"
  | "mpn"
  | "setMpn"
  | "primaryCategoryId"
  | "additionalCategoryIds"
  | "setAdditionalCategoryIds"
  | "salesMode"
  | "setSalesMode"
  | "presentation"
  | "setPresentation"
  | "basis"
  | "setBasis"
  | "price"
  | "setPrice"
  | "availability"
  | "setAvailability"
>;

export type ProductGeneralSectionProps = GeneralDraft & {
  detail: ManagedCatalogProductDetail | null;
  labels: Props["labels"];
  languages: Props["languages"];
  categories: Props["categories"];
  titleGuidance: Props["categoryConfigurations"][number]["titleGuidance"];
  editorDisabled: boolean;
  mpnError?: string;
  categoryError?: string;
  bgTitleError?: string;
  errors: Record<string, string>;
  updateTranslation: (
    locale: CatalogLocale,
    field: keyof ProductTranslationDraft,
    value: string,
  ) => void;
  markDirty: (section: ProductEditorSection) => void;
  setPrimary: (categoryId: string) => void;
};
