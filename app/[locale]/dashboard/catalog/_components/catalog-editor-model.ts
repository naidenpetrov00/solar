"use client";

import {
  type ManagedCatalogCategoryDetail,
  type ManagedCatalogCategoryTreeItem,
} from "@/lib/catalog/management-category-types";
import { type ManagedCatalogProductWorkspace } from "@/lib/catalog/management-product-types";
import {
  type CatalogLocale,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import type { CatalogActionResult } from "../category-action-model";
import { type CatalogLabels } from "./catalog-labels";

export type {
  EditorSection,
  FieldCopy,
  LifecycleIntent,
} from "./catalog-editor-types";

export type CatalogWorkspaceProps = {
  locale: string;
  catalogPath: string;
  categories: ManagedCatalogCategoryTreeItem[];
  selected: ManagedCatalogCategoryDetail | null;
  canManage: boolean;
  labels: CatalogLabels;
  openSelectedOnMobile: boolean;
  view: "category" | "products";
  requestedProduct: string | null;
  productWorkspace: ManagedCatalogProductWorkspace | null;
};

export type SpecificationDraft = {
  clientId: string;
  persistedId: string | null;
  valueType: CatalogSpecificationValueType;
  unit: string;
  labels: Record<CatalogLocale, string>;
  options: Array<{
    clientId: string;
    persistedId: string | null;
    labels: Record<CatalogLocale, string>;
  }>;
};

export type CategoryContentDraft = {
  name: string;
  introduction: string;
  metaDescription: string;
  productTitleGuidance: string;
};

export type CategoryContentDrafts = Record<CatalogLocale, CategoryContentDraft>;

export type NewCategorySeed = {
  parentId: string | null;
  parentName: string;
  initialLocale: CatalogLocale;
  initialName: string;
};

export const initialCatalogActionResult: CatalogActionResult = {
  status: "idle",
};
