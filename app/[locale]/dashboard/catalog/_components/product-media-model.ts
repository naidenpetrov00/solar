import type { Props, ProductEditorSection } from "./product-editor-model";
import type { useProductDraft } from "./use-product-draft";

type MediaState = Pick<
  ReturnType<typeof useProductDraft>,
  | "activeLocale"
  | "setActiveLocale"
  | "media"
  | "setMedia"
  | "documents"
  | "setDocuments"
  | "assetsUpdatedAt"
  | "setAssetsUpdatedAt"
>;

export type ProductMediaSectionProps = MediaState & {
  labels: Props["labels"];
  languages: Props["languages"];
  editorDisabled: boolean;
  locale: string;
  productId: string | null;
  productStatus: "draft" | "published" | "archived";
  markDirty: (section: ProductEditorSection) => void;
  clearDirty: (section: ProductEditorSection) => void;
};
