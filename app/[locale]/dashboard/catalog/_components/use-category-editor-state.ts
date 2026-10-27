import { useActionState, useEffect, useState } from "react";
import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import {
  saveCatalogCategoryGeneralAction,
  saveCatalogCategoryTranslationsAction,
} from "../category-action-edit";
import { saveCatalogCategorySpecificationsAction } from "../category-action-specifications";
import type {
  EditorSection,
  CategoryContentDrafts,
} from "./catalog-editor-model";
import { initialCatalogActionResult } from "./catalog-editor-model";
import { categoryContentFromDetail } from "./catalog-editor-actions";

export function useCategoryEditorState(
  detail: ManagedCatalogCategoryDetail,
  clearDirty: (section: EditorSection) => void,
) {
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>("bg");
  const [generalResult, generalAction, generalPending] = useActionState(
    saveCatalogCategoryGeneralAction,
    initialCatalogActionResult,
  );
  const [contentResult, contentAction, contentPending] = useActionState(
    saveCatalogCategoryTranslationsAction,
    initialCatalogActionResult,
  );
  const [specificationResult, specificationAction, specificationPending] =
    useActionState(
      saveCatalogCategorySpecificationsAction,
      initialCatalogActionResult,
    );
  const [bgSlug, setBgSlug] = useState(detail.bgSlug);
  const [enSlug, setEnSlug] = useState(detail.enSlug);
  const [content, setContent] = useState<CategoryContentDrafts>(() =>
    categoryContentFromDetail(detail),
  );
  const [contentErrors, setContentErrors] = useState<Record<string, string>>(
    {},
  );
  const [dismissedContentErrors, setDismissedContentErrors] = useState(false);
  const [dismissedGeneralErrors, setDismissedGeneralErrors] = useState<
    Set<string>
  >(() => new Set());

  useEffect(() => {
    if (
      generalResult.status !== "success" ||
      generalResult.updatedAt !== detail.updatedAt
    ) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setBgSlug(detail.bgSlug);
      setEnSlug(detail.enSlug);
      setDismissedGeneralErrors(new Set());
      clearDirty("general");
    });
    return () => cancelAnimationFrame(frame);
  }, [
    clearDirty,
    detail.bgSlug,
    detail.enSlug,
    detail.updatedAt,
    generalResult.status,
    generalResult.updatedAt,
  ]);
  useEffect(() => {
    if (
      contentResult.status !== "success" ||
      contentResult.updatedAt !== detail.updatedAt
    ) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setContent(categoryContentFromDetail(detail));
      setContentErrors({});
      setDismissedContentErrors(false);
      clearDirty("content");
    });
    return () => cancelAnimationFrame(frame);
  }, [clearDirty, contentResult.status, contentResult.updatedAt, detail]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDismissedContentErrors(false));
    return () => cancelAnimationFrame(frame);
  }, [contentResult.fieldErrors]);
  useEffect(() => {
    if (
      dismissedContentErrors ||
      contentResult.status !== "error" ||
      !contentResult.fieldErrors
    ) {
      return;
    }

    const firstField = Object.keys(contentResult.fieldErrors)[0];
    const [, fieldLocale, fieldName] = firstField?.split(".") ?? [];

    if (
      !fieldLocale ||
      !fieldName ||
      !catalogLocales.includes(fieldLocale as CatalogLocale)
    ) {
      return;
    }

    requestAnimationFrame(() => {
      setActiveLocale(fieldLocale as CatalogLocale);
      requestAnimationFrame(() =>
        document
          .getElementById(`catalog-content-${fieldLocale}-${fieldName}`)
          ?.focus(),
      );
    });
  }, [contentResult.fieldErrors, contentResult.status, dismissedContentErrors]);
  useEffect(() => {
    if (
      specificationResult.status === "success" &&
      specificationResult.updatedAt === detail.updatedAt
    ) {
      clearDirty("specifications");
    }
  }, [
    clearDirty,
    detail.updatedAt,
    specificationResult.status,
    specificationResult.updatedAt,
  ]);
  return {
    activeLocale,
    setActiveLocale,
    generalResult,
    generalAction,
    generalPending,
    contentResult,
    contentAction,
    contentPending,
    specificationResult,
    specificationAction,
    specificationPending,
    bgSlug,
    setBgSlug,
    enSlug,
    setEnSlug,
    content,
    setContent,
    contentErrors,
    setContentErrors,
    dismissedContentErrors,
    setDismissedContentErrors,
    dismissedGeneralErrors,
    setDismissedGeneralErrors,
  };
}
