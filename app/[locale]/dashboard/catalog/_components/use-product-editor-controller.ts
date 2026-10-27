"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type { CatalogProductSpecificationValueInput } from "@/lib/catalog/catalog-inputs";
import type { Props } from "./product-editor-model";
import { createProductPreview } from "./product-preview-model";
import { useProductDraft } from "./use-product-draft";
import { useProductSave } from "./use-product-save";
import { useProductContent } from "./use-product-content";
import { useProductLifecycle } from "./use-product-lifecycle";
import { productEditorViewModel } from "./product-editor-view-model";

export type ProductEditorProps = Props & {
  detail: ManagedCatalogProductDetail | null;
};

export function useProductEditorController(props: ProductEditorProps) {
  const {
    detail,
    categoryId,
    catalogPath,
    dirtySections,
    clearAllDirty,
    onDirty,
  } = props;
  const creating = detail === null;
  const draft = useProductDraft(detail, categoryId);
  const save = useProductSave({
    detail,
    creating,
    clearAllDirty,
    categoryId,
    catalogPath,
    resetFromDetail: draft.resetFromDetail,
    setActiveLocale: draft.setActiveLocale,
    onDirty,
  });
  const lifecycle = useProductLifecycle({
    detail,
    dirtySections,
    confirmDiscard: props.confirmDiscard,
    resetFromDetail: draft.resetFromDetail,
    clearAllDirty,
  });
  const content = useProductContent(draft, creating, save.markDirty);
  const view = productEditorViewModel(
    props,
    detail,
    draft,
    save.saveResult,
    save.creationSubmissionLocked,
  );
  const [origin, setOrigin] = useState("");
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const restorePreviewFocusRef = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setOrigin(window.location.origin),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (draft.isPreviewing) {
      requestAnimationFrame(() => previewHeadingRef.current?.focus());
      return;
    }
    if (restorePreviewFocusRef.current) {
      restorePreviewFocusRef.current = false;
      requestAnimationFrame(() => previewTriggerRef.current?.focus());
    }
  }, [draft.isPreviewing]);

  const setInheritedValue = (
    specificationId: string,
    value: CatalogProductSpecificationValueInput | null,
  ) => {
    draft.setSpecValues((current) =>
      value
        ? [
            ...current.filter(
              (item) => item.specificationId !== specificationId,
            ),
            value,
          ]
        : current.filter((item) => item.specificationId !== specificationId),
    );
    save.markDirty("specifications");
  };

  const setPrimary = (nextCategoryId: string) => {
    if (nextCategoryId === draft.primaryCategoryId) return;
    if (
      (draft.specValues.length > 0 ||
        draft.excludedSpecificationIds.length > 0) &&
      !window.confirm(props.labels.primaryCategoryChange)
    )
      return;
    draft.setPrimaryCategoryId(nextCategoryId);
    draft.setAdditionalCategoryIds((current) =>
      current.filter((id) => id !== nextCategoryId),
    );
    draft.setSpecValues([]);
    draft.setExcludedSpecificationIds([]);
    save.markDirty("general");
    save.markDirty("specifications");
  };

  const previewProduct = createProductPreview({
    translations: draft.translations,
    activeLocale: draft.activeLocale,
    visibleInheritedSpecifications: view.visibleInheritedSpecifications,
    specValues: draft.specValues,
    customSpecifications: draft.customSpecifications,
    media: draft.media,
    labels: props.labels,
    brand: draft.brand,
    mpn: draft.mpn,
    salesMode: draft.salesMode,
    presentation: draft.presentation,
    price: draft.price,
    availability: draft.availability,
  });

  const closePreview = () => {
    restorePreviewFocusRef.current = true;
    draft.setIsPreviewing(false);
  };

  return {
    props,
    detail,
    creating,
    draft,
    save,
    lifecycle,
    content,
    view,
    origin,
    previewProduct,
    closePreview,
    previewHeadingRef,
    previewTriggerRef,
    setInheritedValue,
    setPrimary,
  };
}

export type ProductEditorController = ReturnType<
  typeof useProductEditorController
>;
