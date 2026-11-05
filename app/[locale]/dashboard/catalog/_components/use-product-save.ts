import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type { CatalogLocale } from "@/lib/catalog/model";
import { saveCatalogProductAction } from "../product-actions";
import {
  initialResult,
  type ProductEditorSection,
} from "./product-editor-model";

export function useProductSave({
  detail,
  creating,
  clearAllDirty,
  clearDirty,
  categoryId,
  catalogPath,
  resetFromDetail,
  setActiveLocale,
  onDirty,
}: {
  detail: ManagedCatalogProductDetail | null;
  creating: boolean;
  clearAllDirty: () => void;
  clearDirty: (section: ProductEditorSection) => void;
  categoryId: string;
  catalogPath: string;
  resetFromDetail: (
    detail: ManagedCatalogProductDetail,
    preserveAssets?: boolean,
  ) => void;
  setActiveLocale: (locale: CatalogLocale) => void;
  onDirty: (section: ProductEditorSection) => void;
}) {
  const router = useRouter();
  const [saveResult, saveAction, savePending] = useActionState(
    saveCatalogProductAction,
    initialResult,
  );
  const [creationSubmissionLocked, setCreationSubmissionLocked] =
    useState(false);

  const revisionRef = useRef(0);
  const submittedRevisionRef = useRef<number | null>(null);
  const acceptedSaveRef = useRef<string | null>(null);
  const reloadRequestedRef = useRef<string | null>(null);

  const saveIssuesRef = useRef<HTMLDivElement | null>(null);
  const markDirty = (section: ProductEditorSection) => {
    revisionRef.current += 1;
    onDirty(section);
  };

  const reloadFromServer = () => {
    reloadRequestedRef.current = detail?.updatedAt ?? null;
    router.refresh();
  };

  useEffect(() => {
    if (
      !detail ||
      !reloadRequestedRef.current ||
      reloadRequestedRef.current === detail.updatedAt
    )
      return;
    reloadRequestedRef.current = null;
    resetFromDetail(detail);
    clearAllDirty();
  }, [detail, clearAllDirty, resetFromDetail]);

  useEffect(() => {
    if (saveResult.status !== "success" || !saveResult.updatedAt) return;
    if (creating && saveResult.targetId) {
      clearAllDirty();
      router.replace(
        `${catalogPath}?category=${categoryId}&view=products&product=${saveResult.targetId}`,
      );
      return;
    }
    if (
      !detail ||
      detail.updatedAt !== saveResult.updatedAt ||
      acceptedSaveRef.current === saveResult.updatedAt
    )
      return;
    acceptedSaveRef.current = saveResult.updatedAt;
    if (submittedRevisionRef.current === revisionRef.current) {
      resetFromDetail(detail, true);
      clearDirty("general");
      clearDirty("content");
      clearDirty("specifications");
    }
  }, [
    saveResult,
    detail,
    creating,
    clearAllDirty,
    clearDirty,
    router,
    catalogPath,
    categoryId,
    resetFromDetail,
  ]);

  useEffect(() => {
    if (saveResult.status !== "error") return;
    if (creating)
      requestAnimationFrame(() => setCreationSubmissionLocked(false));
    const ids: Record<string, string> = {
      "content.bg.title": "catalog-product-title-bg",
      bgSlug: "catalog-product-bg-slug",
      enSlug: "catalog-product-en-slug",
      trSlug: "catalog-product-tr-slug",
      ukSlug: "catalog-product-uk-slug",
      mpn: "catalog-product-mpn",
      primaryCategoryId: "catalog-product-categories",
      additionalCategoryIds: "catalog-product-categories",
      salesMode: "catalog-product-sales-mode",
      pricePresentation: "catalog-product-price-presentation",
      price: "catalog-product-price",
      priceEntryBasis: "catalog-product-price-basis",
      availability: "catalog-product-availability",
    };
    const firstField = Object.keys(saveResult.fieldErrors ?? {}).find(
      (key) => ids[key],
    );
    const first = firstField ? ids[firstField] : undefined;
    if (firstField === "content.bg.title" || firstField === "bgSlug")
      requestAnimationFrame(() => setActiveLocale("bg"));
    if (firstField === "enSlug")
      requestAnimationFrame(() => setActiveLocale("en"));
    if (firstField === "trSlug")
      requestAnimationFrame(() => setActiveLocale("tr"));
    if (firstField === "ukSlug")
      requestAnimationFrame(() => setActiveLocale("uk"));
    if (first) {
      requestAnimationFrame(() => document.getElementById(first)?.focus());
      return;
    }
    if (saveResult.publicationIssues?.length) {
      requestAnimationFrame(() => saveIssuesRef.current?.focus());
    }
  }, [saveResult, creating, setActiveLocale]);

  return {
    saveResult,
    saveAction,
    savePending,
    creationSubmissionLocked,
    setCreationSubmissionLocked,
    submittedRevisionRef,
    revisionRef,
    saveIssuesRef,
    markDirty,
    reloadFromServer,
  };
}
