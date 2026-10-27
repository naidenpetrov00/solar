import type {
  CatalogAvailability,
  CatalogLocale,
  CatalogSalesMode,
} from "@/lib/catalog/model";
import type {
  CatalogPriceInput,
  CatalogProductMediaInput,
  CatalogProductSpecificationConfigurationInput,
  CatalogProductSpecificationValueInput,
  CatalogProductTranslationInput,
} from "@/lib/catalog/catalog-inputs";
import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";

export type CatalogProductPublicationIssue =
  | {
      code: "MISSING_PRODUCT_TRANSLATION_FIELD";
      locale: CatalogLocale;
      field: "title" | "shortDescription" | "fullDescription";
    }
  | { code: "CATEGORY_NOT_PUBLISHED"; categoryId: string }
  | {
      code: "MISSING_REQUIRED_SPECIFICATION";
      specificationId: string;
    }
  | { code: "INVALID_SPECIFICATION_VALUE"; specificationId: string }
  | {
      code: "MISSING_CUSTOM_SPECIFICATION_LABEL";
      specificationId: string;
      locale: CatalogLocale;
    }
  | {
      code: "MISSING_CUSTOM_OPTION_LABEL";
      specificationId: string;
      optionId: string;
      locale: CatalogLocale;
    }
  | { code: "MODEL_REQUIRED" }
  | { code: "INVALID_COMMERCE" }
  | { code: "PRIMARY_IMAGE_REQUIRED" }
  | { code: "SOCIAL_IMAGE_LIMIT" }
  | {
      code: "MISSING_MEDIA_ALT";
      mediaId: string;
      mediaReference: string;
      locale: CatalogLocale;
    };

export type ManagedCatalogProductSummary = {
  id: string;
  title: string;
  sku: string;
  status: "draft" | "published" | "archived";
  salesMode: CatalogSalesMode;
  availability: CatalogAvailability | null;
  updatedAt: string;
};

export type ManagedCatalogProductDetail = ManagedCatalogProductSummary & {
  brand: string | null;
  bgSlug: string;
  enSlug: string;
  trSlug: string | null;
  ukSlug: string | null;
  primaryCategoryId: string;
  additionalCategoryIds: string[];
  mpn: string | null;
  pricePresentation: "exact" | "from" | "on_request";
  priceEntryBasis: "vat_inclusive" | "vat_exclusive" | null;
  priceInputMinor: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  translations: CatalogProductTranslationInput[];
  titleGuidance: Array<{
    locale: CatalogLocale;
    value: string | null;
  }>;
  specifications: ManagedCatalogCategoryDetail["specifications"];
  specificationValues: CatalogProductSpecificationValueInput[];
  specificationConfiguration: CatalogProductSpecificationConfigurationInput;
  media: Array<CatalogProductMediaInput & { id: string }>;
  publicationIssues: CatalogProductPublicationIssue[];
};

export type ManagedCatalogProductWorkspace = {
  products: ManagedCatalogProductSummary[];
  selected: ManagedCatalogProductDetail | null;
  categoryConfigurations: Array<{
    categoryId: string;
    specifications: ManagedCatalogCategoryDetail["specifications"];
    titleGuidance: ManagedCatalogProductDetail["titleGuidance"];
  }>;
};

export type CreateCatalogProductInput = {
  actorId: string;
  brand?: string | null;
  bgSlug: string;
  enSlug: string;
  trSlug: string | null;
  ukSlug: string | null;
  salesMode: CatalogSalesMode;
  primaryCategoryId: string;
  additionalCategoryIds?: string[];
  availability: CatalogAvailability | null;
  mpn: string;
  price: CatalogPriceInput;
  translations?: CatalogProductTranslationInput[];
  specificationValues?: CatalogProductSpecificationValueInput[];
  specificationConfiguration?: CatalogProductSpecificationConfigurationInput;
  media?: CatalogProductMediaInput[];
};

export type UpdateCatalogProductInput = {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  brand?: string | null;
  bgSlug: string;
  enSlug: string;
  trSlug: string | null;
  ukSlug: string | null;
  salesMode: CatalogSalesMode;
  primaryCategoryId: string;
  availability: CatalogAvailability | null;
  mpn: string;
  price: CatalogPriceInput;
  additionalCategoryIds?: string[];
  discardSpecificationValues?: boolean;
  translations: CatalogProductTranslationInput[];
  specificationValues: CatalogProductSpecificationValueInput[];
  specificationConfiguration: CatalogProductSpecificationConfigurationInput;
  media: CatalogProductMediaInput[];
};
