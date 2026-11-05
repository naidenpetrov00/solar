"use client";

import { type CatalogCategoryPublicationIssue } from "@/lib/catalog/management-category-types";
import {
  type CatalogLocale,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import type { CatalogActionCode } from "../category-action-model";
import { type ProductLabels } from "./product-labels";
import {
  type EditorSection,
  type FieldCopy,
  type LifecycleIntent,
} from "./catalog-editor-types";
import type { CatalogSectionSaveCopy } from "./catalog-section-save-state";

export type CatalogLabels = {
  title: string;
  description: string;
  readOnly: string;
  languages: Record<CatalogLocale, string>;
  status: Record<"draft" | "published" | "archived", string>;
  tree: {
    title: string;
    empty: string;
    createRoot: string;
    addChild: string;
    openCategory: string;
    moveUp: string;
    moveDown: string;
    back: string;
  };
  editor: {
    emptyTitle: string;
    emptyDescription: string;
    sourceLanguage: string;
    complete: string;
    incomplete: string;
  };
  sections: Record<EditorSection, string>;
  fields: {
    bgSlug: FieldCopy;
    enSlug: FieldCopy;
    parent: FieldCopy;
    name: FieldCopy;
    introduction: FieldCopy;
    metaDescription: FieldCopy;
    productTitleGuidance: FieldCopy;
  };
  seoPreview: {
    title: string;
    note: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  actions: {
    save: string;
    cleanupPending: string;
    saving: string;
    move: string;
    publish: string;
    unpublish: string;
    archive: string;
    restore: string;
    working: string;
    reload: string;
  };
  create: {
    title: string;
    description: string;
    parentLabel: string;
    root: string;
    name: string;
    cancel: string;
    continue: string;
    editorTitle: string;
    editorDescription: string;
    discard: string;
    submit: string;
    submitting: string;
  };
  move: {
    title: string;
    description: string;
    parent: string;
    root: string;
    cancel: string;
    submit: string;
  };
  lifecycle: Record<
    LifecycleIntent,
    { title: string; description: string; confirm: string }
  > & {
    cancel: string;
  };
  readiness: {
    title: string;
    ready: string;
    blocked: string;
    messages: Record<CatalogCategoryPublicationIssue["code"], string>;
  };
  specifications: {
    empty: string;
    emptyDescription: string;
    add: string;
    remove: string;
    moveUp: string;
    moveDown: string;
    item: string;
    expand: string;
    collapse: string;
    languageLabel: string;
    languageHelp: string;
    preview: {
      title: string;
      illustrative: string;
      description: string;
      emptyUnit: string;
      labels: Record<CatalogSpecificationValueType, string>;
      values: Record<CatalogSpecificationValueType, string>;
    };
    name: FieldCopy;
    type: FieldCopy;
    unit: FieldCopy;
    required: FieldCopy;
    filterable: FieldCopy;
    options: string;
    optionsHelp: string;
    addOption: string;
    removeOption: string;
    optionName: FieldCopy;
    confirmRemove: string;
    confirmClearOptions: string;
    types: Record<CatalogSpecificationValueType, string>;
  };
  cover: {
    title: string;
    empty: string;
    select: string;
    upload: string;
    replace: string;
    save: string;
    remove: string;
    deleteConfirm: string;
    altText: string;
    languageLabel: string;
    statuses: Record<"optimizing" | "uploading" | "finalizing" | "success" | "error", string>;
    errors: Record<string, string>;
  };
  unsaved: {
    title: string;
    message: string;
  };
  saveState: CatalogSectionSaveCopy;
  validation: {
    required: string;
    slug: string;
    conflict: string;
    selectionOption: string;
  };
  results: Record<CatalogActionCode, string>;
  product: ProductLabels;
};
