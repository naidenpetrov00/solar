"use client";

import { type ManagedCatalogCategoryTreeItem } from "@/lib/catalog/management-category-types";
import {
  type ManagedCatalogProductDetail,
  type ManagedCatalogProductSummary,
  type ManagedCatalogProductWorkspace,
} from "@/lib/catalog/management-product-types";
import { type CatalogLocale } from "@/lib/catalog/model";
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
  clearDirty: (section: ProductEditorSection) => void;
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
  source: "managed" | "legacy";
  reference: string | null;
  url: string;
  originalFilename: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  isSocialImage: boolean;
  translations: Record<CatalogLocale, string>;
};

export type DocumentDraft = {
  clientId: string;
  url: string;
  originalFilename: string;
  byteSize: number;
  translations: Record<
    CatalogLocale,
    { title: string; description: string }
  >;
};

export const initialResult: ProductActionResult = { status: "idle" };
