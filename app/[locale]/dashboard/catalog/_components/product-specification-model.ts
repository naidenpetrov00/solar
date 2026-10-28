import type { CatalogProductSpecificationValueInput } from "@/lib/catalog/catalog-inputs";
import type { Props, ProductEditorSection } from "./product-editor-model";
import type { useProductDraft } from "./use-product-draft";

type SpecificationDraft = Pick<
  ReturnType<typeof useProductDraft>,
  | "primaryCategoryId"
  | "specValues"
  | "setSpecValues"
  | "setExcludedSpecificationIds"
>;

export type ProductSpecificationSectionProps = SpecificationDraft & {
  labels: Props["labels"];
  catalogPath: string;
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
