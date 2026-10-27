import type { CatalogLocale } from "@/lib/catalog/model";

export type PublicCatalogMedia = {
  reference: string;
  altText: string;
  isPrimary: boolean;
  isSocialImage: boolean;
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

export type PublicCatalogPrice = {
  presentation: "exact" | "from";
  currency: "EUR";
  publicVatInclusiveMinor: string;
  vatRateBasisPoints: number;
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
  specifications: PublicCatalogSpecification[];
  primaryCategory: PublicCatalogCategory;
  additionalCategories: PublicCatalogCategory[];
  paths: Record<CatalogLocale, string>;
  updatedAt: Date;
};
