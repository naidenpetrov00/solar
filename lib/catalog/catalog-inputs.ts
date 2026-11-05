import type {
  CatalogLocale,
  CatalogPriceEntryBasis,
  CatalogSpecificationValueType,
} from "@/lib/catalog/model";

export type CatalogCategoryTranslationInput = {
  locale: CatalogLocale;
  name: string;
  introduction: string;
  detailedContent?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  productTitleGuidance?: string | null;
};

export type CatalogSpecificationTranslationInput = {
  locale: CatalogLocale;
  label: string;
};

export type CatalogSpecificationOptionInput = {
  code: string;
  displayOrder: number;
  translations: CatalogSpecificationTranslationInput[];
};

export type CatalogSpecificationInput = {
  key: string;
  valueType: CatalogSpecificationValueType;
  unit?: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  displayOrder: number;
  translations: CatalogSpecificationTranslationInput[];
  options: CatalogSpecificationOptionInput[];
};

export type CatalogProductTranslationInput = {
  locale: CatalogLocale;
  title: string;
  shortDescription: string;
  fullDescription: string;
  marketingLabel?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
};

export type CatalogPricedInput = {
  presentation: "exact" | "from";
  entryBasis: CatalogPriceEntryBasis;
  inputMinor: bigint;
};

export type CatalogPriceOnRequestInput = {
  presentation: "on_request";
  entryBasis: null;
  inputMinor: null;
};

export type CatalogPriceInput = CatalogPricedInput | CatalogPriceOnRequestInput;

export type CatalogProductSpecificationValueInput =
  | { specificationId: string; type: "text"; value: string }
  | { specificationId: string; type: "number"; value: string }
  | { specificationId: string; type: "boolean"; value: boolean }
  | { specificationId: string; type: "selection"; optionId: string };

export type CatalogProductSpecificationConfigurationInput = {
  excludedSpecificationIds: string[];
  customSpecifications: [];
};
