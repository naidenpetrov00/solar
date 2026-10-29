import type {
  CatalogLocale,
  CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import type {
  CatalogCategoryTranslationInput,
  CatalogSpecificationInput,
} from "@/lib/catalog/catalog-inputs";
import type { ManagedCatalogCover } from "./management-asset-types";

export type CatalogCategoryPublicationIssue =
  | { code: "PARENT_NOT_PUBLISHED" }
  | { code: "MISSING_CATEGORY_TRANSLATION"; locale: CatalogLocale }
  | {
      code: "MISSING_SPECIFICATION_TRANSLATION";
      locale: CatalogLocale;
      specificationKey: string;
    }
  | { code: "SELECTION_OPTIONS_REQUIRED"; specificationKey: string }
  | {
      code: "MISSING_OPTION_TRANSLATION";
      locale: CatalogLocale;
      specificationKey: string;
      optionCode: string;
    };

export type ManagedCatalogCategoryTreeItem = {
  id: string;
  parentId: string | null;
  bgSlug: string;
  enSlug: string;
  slug: string;
  name: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  assetsUpdatedAt: string;
};

export type ManagedCatalogCategoryDetail = {
  id: string;
  parentId: string | null;
  bgSlug: string;
  enSlug: string;
  slug: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
  translations: Array<{
    locale: CatalogLocale;
    name: string;
    introduction: string;
    detailedContent: string | null;
    seoTitle: string | null;
    metaDescription: string | null;
    productTitleGuidance: string | null;
  }>;
  specifications: Array<{
    id: string;
    key: string;
    valueType: "text" | "number" | "boolean" | "selection";
    unit: string | null;
    isRequired: boolean;
    isFilterable: boolean;
    displayOrder: number;
    translations: Array<{ locale: CatalogLocale; label: string }>;
    options: Array<{
      id: string;
      code: string;
      displayOrder: number;
      translations: Array<{ locale: CatalogLocale; label: string }>;
    }>;
  }>;
  cover: ManagedCatalogCover | null;
  publicationIssues: CatalogCategoryPublicationIssue[];
};

export type ManagedCatalogCategoryWorkspace = {
  canManage: boolean;
  categories: ManagedCatalogCategoryTreeItem[];
  selected: ManagedCatalogCategoryDetail | null;
};

export type CatalogSpecificationEditorOptionInput = {
  id?: string | null;
  displayOrder: number;
  translations: Array<{ locale: CatalogLocale; label: string }>;
};

export type CatalogSpecificationEditorInput = {
  id?: string | null;
  valueType: CatalogSpecificationValueType;
  unit?: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  displayOrder: number;
  translations: Array<{ locale: CatalogLocale; label: string }>;
  options: CatalogSpecificationEditorOptionInput[];
};

export type CreateCatalogCategoryInput = {
  actorId: string;
  parentId?: string | null;
  bgSlug: string;
  enSlug: string;
  translations: CatalogCategoryTranslationInput[];
  specifications?: CatalogSpecificationInput[];
};

export type UpdateCatalogCategoryInput = {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  bgSlug: string;
  enSlug: string;
};
