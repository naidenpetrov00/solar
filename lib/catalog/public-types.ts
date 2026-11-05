import type { CatalogLocale } from "@/lib/catalog/model";

export type PublicCatalogMedia = {
  reference: string;
  altText: string;
  isPrimary: boolean;
  isSocialImage: boolean;
  source: "managed" | "legacy";
  width: number | null;
  height: number | null;
};

export type PublicCatalogDocument = {
  url: string;
  title: string;
  description: string | null;
  originalFilename: string;
  byteSize: number;
};

export type PublicCatalogCategory = {
  id: string;
  parentId: string | null;
  name: string;
  introduction: string;
  detailedContent: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  path: string;
  paths: Record<CatalogLocale, string>;
  updatedAt: Date;
  cover: (PublicCatalogMedia & { width: number; height: number }) | null;
};

export type PublicCatalogCategoryNode = PublicCatalogCategory & {
  children: PublicCatalogCategoryNode[];
};

export const publicCatalogSorts = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;

export type PublicCatalogSort = (typeof publicCatalogSorts)[number];

export type PublicCatalogFacetOption = {
  value: string;
  label: string | null;
  count: number;
  selected: boolean;
};

export type PublicCatalogFacet = {
  id: string;
  label: string;
  contextLabel: string | null;
  valueType: "text" | "number" | "boolean" | "selection";
  unit: string | null;
  options: PublicCatalogFacetOption[];
  minimum: string | null;
  maximum: string | null;
  selectedMinimum: string | null;
  selectedMaximum: string | null;
};

export type PublicCatalogListing = {
  products: PublicCatalogProductSummary[];
  facets: PublicCatalogFacet[];
  totalCount: number;
  resultCount: number;
  sort: PublicCatalogSort;
  hasActiveFilters: boolean;
};

export type PublicCatalogProductSummary = {
  id: string;
  slug: string;
  title: string;
  marketingLabel: string | null;
  shortDescription: string;
  salesMode: "direct_purchase" | "enquiry";
  availability: "in_stock" | "out_of_stock" | null;
  price: PublicCatalogPrice | null;
  primaryMedia: PublicCatalogMedia | null;
};

export type PublicCatalogPromotion = {
  id: string;
  label: string | null;
  savingsBasisPoints: number | null;
};

export type PublicCatalogPrice = {
  presentation: "exact" | "from";
  currency: "EUR";
  vatRateBasisPoints: 2000;
  originalVatInclusiveMinor: string;
  originalVatExclusiveMinor: string;
  effectiveVatInclusiveMinor: string;
  effectiveVatExclusiveMinor: string;
  promotion: PublicCatalogPromotion | null;
};

export type PublicCatalogSpecification = {
  label: string;
  value: string | boolean;
  unit: string | null;
};

export type PublicCatalogProductDetail = PublicCatalogProductSummary & {
  sku: string;
  brand: string | null;
  model: string | null;
  fullDescription: string;
  seoTitle: string | null;
  metaDescription: string | null;
  media: PublicCatalogMedia[];
  documents: PublicCatalogDocument[];
  specifications: PublicCatalogSpecification[];
  primaryCategory: PublicCatalogCategory;
  additionalCategories: PublicCatalogCategory[];
  paths: Record<CatalogLocale, string>;
  updatedAt: Date;
};
