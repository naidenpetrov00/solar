import type { Props, ProductEditorSection } from "./product-editor-model";
import type { useProductDraft } from "./use-product-draft";

type MediaState = Pick<
  ReturnType<typeof useProductDraft>,
  "activeLocale" | "setActiveLocale" | "media" | "setMedia"
>;

export type ProductMediaSectionProps = MediaState & {
  labels: Props["labels"];
  languages: Props["languages"];
  editorDisabled: boolean;
  markDirty: (section: ProductEditorSection) => void;
};
