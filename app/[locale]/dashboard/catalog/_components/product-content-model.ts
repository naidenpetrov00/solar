import type { CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type { Props, ProductTranslationDraft } from "./product-editor-model";
import type { FieldCopy } from "./product-labels";
import type { useProductDraft } from "./use-product-draft";

type ContentDraft = Pick<
  ReturnType<typeof useProductDraft>,
  | "activeLocale"
  | "setActiveLocale"
  | "translations"
  | "bgSlug"
  | "enSlug"
  | "trSlug"
  | "ukSlug"
>;

export type ProductContentSectionProps = ContentDraft & {
  detail: ManagedCatalogProductDetail | null;
  labels: Props["labels"];
  languages: Props["languages"];
  editorDisabled: boolean;
  origin: string;
  creating: boolean;
  contentComplete: Record<CatalogLocale, boolean>;
  productSlugs: Record<CatalogLocale, string>;
  slugErrors: Partial<Record<CatalogLocale, string>>;
  slugCopyByLocale: Record<CatalogLocale, FieldCopy>;
  slugAutoManaged: Record<CatalogLocale, boolean>;
  updateProductSlug: (
    locale: CatalogLocale,
    value: string,
    manual: boolean,
  ) => void;
  updateTranslation: (
    locale: CatalogLocale,
    field: keyof ProductTranslationDraft,
    value: string,
  ) => void;
};
