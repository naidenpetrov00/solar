"use client";

import { type CatalogProductDetailLabels } from "../../../_components/catalog-product-detail";
import { type CatalogProductPublicationIssue } from "@/lib/catalog/management-product-types";
import {
  type LifecycleIntent,
  type ProductEditorSection,
} from "./product-editor-types";
import type { CatalogSectionSaveCopy } from "./catalog-section-save-state";

export type FieldCopy = { label: string; help: string; example?: string };

export type ProductLabels = {
  views: { category: string; products: string; ariaLabel: string };
  list: {
    title: string;
    empty: string;
    add: string;
    open: string;
    untitled: string;
  };
  editor: {
    newTitle: string;
    newDescription: string;
    editDescription: string;
    back: string;
    readOnly: string;
    skuPending: string;
    complete: string;
    incomplete: string;
    unsaved: string;
  };
  saveState: CatalogSectionSaveCopy;
  preview: CatalogProductDetailLabels & {
    open: string;
    back: string;
    title: string;
    emptyTitle: string;
  };
  sections: Record<ProductEditorSection, string>;
  fields: {
    sku: FieldCopy;
    bgSlug: FieldCopy;
    enSlug: FieldCopy;
    trSlug: FieldCopy;
    ukSlug: FieldCopy;
    brand: FieldCopy;
    mpn: FieldCopy;
    primaryCategory: FieldCopy;
    additionalCategories: FieldCopy;
    salesMode: FieldCopy;
    pricePresentation: FieldCopy;
    price: FieldCopy;
    priceEntryBasis: FieldCopy;
    availability: FieldCopy;
    title: FieldCopy;
    shortDescription: FieldCopy;
    fullDescription: FieldCopy;
    marketingLabel: FieldCopy;
    seoTitle: FieldCopy;
    metaDescription: FieldCopy;
    mediaReference: FieldCopy;
    altText: FieldCopy;
  };
  categories: {
    title: string;
    help: string;
    primaryHelp: string;
    additionalHelp: string;
    setPrimary: string;
    addAdditional: string;
    removeAdditional: string;
    primary: string;
    additional: string;
    expand: string;
    collapse: string;
  };
  sales: {
    directPurchase: string;
    enquiry: string;
    exact: string;
    from: string;
    onRequest: string;
    vatInclusive: string;
    vatExclusive: string;
    counterpartInclusive: string;
    counterpartExclusive: string;
    inStock: string;
    outOfStock: string;
  };
  content: {
    titleGuidance: string;
    titleStructure: string;
    updateSlug: string;
    seoGroup: string;
    previewTitle: string;
    previewNote: string;
    emptyProductTitle: string;
    emptyMetaDescription: string;
  };
  specifications: {
    empty: string;
    required: string;
    yes: string;
    no: string;
    choose: string;
    removeInherited: string;
    restoreInherited: string;
    removed: string;
    manageCategory: string;
    categoryChangePending: string;
  };
  media: {
    empty: string;
    upload: string;
    select: string;
    legacy: string;
    managed: string;
    save: string;
    saved: string;
    cleanupPending: string;
    remove: string;
    deleteConfirm: string;
    removeLegacyConfirm: string;
    discardChangesConfirm: string;
    reconciled: string;
    reconciliationCanceled: string;
    moveUp: string;
    moveDown: string;
    primary: string;
    social: string;
    languageLabel: string;
    originalSize: string;
    uploadSize: string;
    statuses: Record<
      | "queued"
      | "optimizing"
      | "uploading"
      | "awaiting"
      | "finalizing"
      | "success"
      | "canceled"
      | "reconciliation"
      | "error",
      string
    >;
    retry: string;
    cancel: string;
    errors: Record<string, string>;
  };
  documents: {
    empty: string;
    upload: string;
    select: string;
    title: string;
    description: string;
    save: string;
    remove: string;
    deleteConfirm: string;
    discardChangesConfirm: string;
    moveUp: string;
    moveDown: string;
    languageLabel: string;
    pdf: string;
  };
  actions: {
    create: string;
    creating: string;
    save: string;
    saving: string;
    publish: string;
    unpublish: string;
    archive: string;
    restore: string;
    working: string;
    cancel: string;
    reload: string;
  };
  lifecycle: Record<
    LifecycleIntent,
    { title: string; description: string; confirm: string }
  >;
  readiness: {
    title: string;
    ready: string;
    blocked: string;
    fields: Record<"title" | "shortDescription" | "fullDescription", string>;
    messages: Record<CatalogProductPublicationIssue["code"], string>;
  };
  validation: {
    required: string;
    invalid: string;
    slug: string;
    conflict: string;
  };
  results: Record<string, string>;
  primaryCategoryChange: string;
};
