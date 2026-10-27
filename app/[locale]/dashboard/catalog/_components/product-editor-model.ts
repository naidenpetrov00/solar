"use client";

import { type ManagedCatalogCategoryTreeItem } from "@/lib/catalog/management-category-types";
import {
  type ManagedCatalogProductDetail,
  type ManagedCatalogProductSummary,
  type ManagedCatalogProductWorkspace,
} from "@/lib/catalog/management-product-types";
import { type CatalogLocale } from "@/lib/catalog/model";
import { type CatalogProductCustomSpecificationInput } from "@/lib/catalog/catalog-inputs";
import { type ProductActionResult } from "../product-action-model";
import { type ProductLabels } from "./product-labels";
import type { ProductEditorSection } from "./product-editor-types";

type ProductStatus = "draft" | "published" | "archived";

export type {
  LifecycleIntent,
  ProductEditorSection,
} from "./product-editor-types";

export type Props = {
  locale: string;
  catalogPath: string;
  categoryId: string;
  categories: ManagedCatalogCategoryTreeItem[];
  categoryConfigurations: ManagedCatalogProductWorkspace["categoryConfigurations"];
  products: ManagedCatalogProductSummary[];
  requestedProduct: string | null;
  selectedProduct: ManagedCatalogProductDetail | null;
  canManage: boolean;
  labels: ProductLabels;
  languages: Record<CatalogLocale, string>;
  statusLabels: Record<ProductStatus, string>;
  dirtySections: Set<ProductEditorSection>;
  onDirty: (section: ProductEditorSection) => void;
  clearAllDirty: () => void;
  confirmDiscard: () => boolean;
};

export type ProductTranslationDraft = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  marketingLabel: string;
  seoTitle: string;
  metaDescription: string;
};

export type MediaDraft = {
  clientId: string;
  reference: string;
  isPrimary: boolean;
  isSocialImage: boolean;
  translations: Record<CatalogLocale, string>;
};

export type CustomSpecificationDraft = Omit<
  CatalogProductCustomSpecificationInput,
  "translations" | "options"
> & {
  labels: Record<CatalogLocale, string>;
  options: Array<{
    id: string;
    labels: Record<CatalogLocale, string>;
  }>;
};

export const initialResult: ProductActionResult = { status: "idle" };
