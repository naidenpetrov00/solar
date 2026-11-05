import { useEffect, useRef, useState } from "react";
import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { CatalogActionResult } from "../category-action-model";
import type { SpecificationDraft } from "./catalog-editor-model";
import { initialSpecifications } from "./catalog-specification-draft";

export function useSpecificationEditor(
  detail: ManagedCatalogCategoryDetail,
  result: CatalogActionResult,
  onDirty: () => void,
) {
  const [specifications, setSpecifications] = useState(() =>
    initialSpecifications(detail),
  );
  const [specificationLocale, setSpecificationLocale] =
    useState<CatalogLocale>("bg");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(detail.specifications.slice(0, 1).map(({ id }) => id)),
  );
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [clientValidationId, setClientValidationId] = useState<string | null>(
    null,
  );
  const [dismissedErrors, setDismissedErrors] = useState<{
    fieldErrors: CatalogActionResult["fieldErrors"];
    dismissed: boolean;
  }>({ fieldErrors: result.fieldErrors, dismissed: false });
  const dismissedServerErrors =
    dismissedErrors.fieldErrors === result.fieldErrors &&
    dismissedErrors.dismissed;
  const setDismissedServerErrors = (dismissed: boolean) =>
    setDismissedErrors({ fieldErrors: result.fieldErrors, dismissed });
  const acceptedSaveRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      result.status !== "success" ||
      !result.updatedAt ||
      detail.updatedAt !== result.updatedAt ||
      acceptedSaveRef.current === result.updatedAt
    ) {
      return;
    }

    const refreshed = initialSpecifications(detail);
    setSpecifications(refreshed);
    setExpanded(new Set(refreshed.slice(0, 1).map(({ clientId }) => clientId)));
    setClientValidationId(null);
    acceptedSaveRef.current = result.updatedAt;
  }, [detail, result.status, result.updatedAt]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(pendingFocusId)?.focus();
      setPendingFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocusId, specifications, specificationLocale]);

  useEffect(() => {
    if (
      dismissedServerErrors ||
      result.status !== "error" ||
      !result.fieldErrors
    ) {
      return;
    }
    const firstField = Object.keys(result.fieldErrors)[0];
    const parts = firstField?.split(".") ?? [];
    const specificationIndex = Number(parts[1]);
    const specification = specifications[specificationIndex];
    if (!specification) return;

    let targetId: string | null = null;
    let targetLocale: CatalogLocale = specificationLocale;
    if (
      parts[2] === "translations" &&
      catalogLocales.includes(parts[3] as CatalogLocale)
    ) {
      targetLocale = parts[3] as CatalogLocale;
      targetId = `specification-name-${specification.clientId}-${targetLocale}`;
    } else if (parts[2] === "options" && parts.length === 3) {
      targetId = `specification-add-option-${specification.clientId}`;
    } else if (
      parts[2] === "options" &&
      parts[4] === "translations" &&
      catalogLocales.includes(parts[5] as CatalogLocale)
    ) {
      const option = specification.options[Number(parts[3])];
      if (!option) return;
      targetLocale = parts[5] as CatalogLocale;
      targetId = `specification-option-${option.clientId}-${targetLocale}`;
    }

    if (!targetId) return;
    const frame = requestAnimationFrame(() => {
      setSpecificationLocale(targetLocale);
      setExpanded((current) => new Set(current).add(specification.clientId));
      setClientValidationId(targetId);
      setPendingFocusId(targetId);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    dismissedServerErrors,
    result.fieldErrors,
    result.status,
    specifications,
    specificationLocale,
  ]);

  const updateSpecification = (
    index: number,
    update: (specification: SpecificationDraft) => SpecificationDraft,
  ) => {
    setDismissedServerErrors(true);
    setSpecifications((current) =>
      current.map((specification, candidateIndex) =>
        candidateIndex === index ? update(specification) : specification,
      ),
    );
    onDirty();
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= specifications.length) return;
    setSpecifications((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    onDirty();
  };
  const toggleExpanded = (clientId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  return {
    specifications,
    setSpecifications,
    specificationLocale,
    setSpecificationLocale,
    expanded,
    setExpanded,
    setPendingFocusId,
    clientValidationId,
    setClientValidationId,
    dismissedServerErrors,
    setDismissedServerErrors,
    updateSpecification,
    move,
    toggleExpanded,
  };
}
