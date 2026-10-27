import type { CatalogProductSpecificationValueInput } from "@/lib/catalog/catalog-inputs";
import type { Props, ProductEditorSection } from "./product-editor-model";
import type { useProductDraft } from "./use-product-draft";

type SpecificationDraft = Pick<
  ReturnType<typeof useProductDraft>,
  | "activeLocale"
  | "setActiveLocale"
  | "primaryCategoryId"
  | "specValues"
  | "setSpecValues"
  | "setExcludedSpecificationIds"
  | "customSpecifications"
  | "setCustomSpecifications"
>;

export type ProductSpecificationSectionProps = SpecificationDraft & {
  labels: Props["labels"];
  languages: Props["languages"];
  locale: string;
  editorDisabled: boolean;
  markDirty: (section: ProductEditorSection) => void;
  initialPrimaryCategoryId: string;
  visibleInheritedSpecifications: Props["categoryConfigurations"][number]["specifications"];
  removedInheritedSpecifications: Props["categoryConfigurations"][number]["specifications"];
  setInheritedValue: (
    specificationId: string,
    value: CatalogProductSpecificationValueInput | null,
  ) => void;
};

export type ProductCustomSpecificationProps = {
  specification: ProductSpecificationSectionProps["customSpecifications"][number];
  props: ProductSpecificationSectionProps;
};
