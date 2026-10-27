import { useActionState, useEffect, useState, type FormEvent } from "react";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { createCatalogCategoryAction } from "../category-action-create";
import {
  type NewCategorySeed,
  type EditorSection,
  type CategoryContentDrafts,
  initialCatalogActionResult,
  type CategoryContentDraft,
} from "./catalog-editor-model";
import {
  emptyCategoryContentDrafts,
  slugPattern,
} from "./catalog-editor-actions";

export function useNewCategoryDraft({
  seed,
  onDirty,
  clearDirty,
  onCreated,
}: {
  seed: NewCategorySeed;
  onDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
  onCreated: (categoryId: string) => void;
}) {
  const [activeLocale, setActiveLocale] = useState(seed.initialLocale);
  const [content, setContent] = useState<CategoryContentDrafts>(() => {
    const initialDrafts = emptyCategoryContentDrafts();
    initialDrafts[seed.initialLocale].name = seed.initialName;
    return initialDrafts;
  });
  const [bgSlug, setBgSlug] = useState("");
  const [enSlug, setEnSlug] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(
    () => new Set(),
  );
  const [result, action, pending] = useActionState(
    createCatalogCategoryAction,
    initialCatalogActionResult,
  );
  const serverErrors = Object.fromEntries(
    Object.entries(result.fieldErrors ?? {}).filter(
      ([field]) => !dismissedErrors.has(field),
    ),
  );
  const errors = { ...serverErrors, ...clientErrors };

  useEffect(() => {
    if (result.status === "success" && result.targetId) {
      clearDirty("general");
      clearDirty("content");
      onCreated(result.targetId);
    }
  }, [clearDirty, onCreated, result.status, result.targetId]);

  useEffect(() => {
    if (result.status !== "error" || !result.fieldErrors) return;
    const firstField = Object.keys(result.fieldErrors)[0];
    if (firstField === "bgSlug" || firstField === "enSlug") {
      requestAnimationFrame(() =>
        document.getElementById(`catalog-create-${firstField}`)?.focus(),
      );
      return;
    }
    const [, fieldLocale, fieldName] = firstField.split(".");
    if (!catalogLocales.includes(fieldLocale as CatalogLocale)) return;
    requestAnimationFrame(() => {
      setActiveLocale(fieldLocale as CatalogLocale);
      requestAnimationFrame(() =>
        document
          .getElementById(`catalog-create-content-${fieldLocale}-${fieldName}`)
          ?.focus(),
      );
    });
  }, [result.fieldErrors, result.status]);

  const changeContent = (
    contentLocale: CatalogLocale,
    values: CategoryContentDraft,
  ) => {
    setContent((current) => ({ ...current, [contentLocale]: values }));
    setDismissedErrors((current) => {
      const next = new Set(current);
      next.add(`content.${contentLocale}.name`);
      next.add(`content.${contentLocale}.introduction`);
      return next;
    });
    setClientErrors((current) => {
      const next = { ...current };
      delete next[`content.${contentLocale}.name`];
      delete next[`content.${contentLocale}.introduction`];
      return next;
    });
    onDirty("content");
  };

  const changeSlug = (field: "bgSlug" | "enSlug", value: string) => {
    if (field === "bgSlug") setBgSlug(value);
    else setEnSlug(value);
    setDismissedErrors((current) => new Set(current).add(field));
    setClientErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    onDirty("general");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const nextErrors: Record<string, string> = {};
    for (const contentLocale of catalogLocales) {
      if (!content[contentLocale].name.trim()) {
        nextErrors[`content.${contentLocale}.name`] = "REQUIRED";
      }
      if (!content[contentLocale].introduction.trim()) {
        nextErrors[`content.${contentLocale}.introduction`] = "REQUIRED";
      }
    }
    if (!slugPattern.test(bgSlug)) {
      nextErrors.bgSlug = bgSlug ? "INVALID" : "REQUIRED";
    }
    if (!slugPattern.test(enSlug)) {
      nextErrors.enSlug = enSlug ? "INVALID" : "REQUIRED";
    }
    setClientErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    if (!firstField) return;
    event.preventDefault();
    if (firstField === "bgSlug" || firstField === "enSlug") {
      requestAnimationFrame(() =>
        document.getElementById(`catalog-create-${firstField}`)?.focus(),
      );
      return;
    }
    const [, fieldLocale, fieldName] = firstField.split(".");
    setActiveLocale(fieldLocale as CatalogLocale);
    requestAnimationFrame(() =>
      document
        .getElementById(`catalog-create-content-${fieldLocale}-${fieldName}`)
        ?.focus(),
    );
  };

  return {
    activeLocale,
    setActiveLocale,
    content,
    bgSlug,
    enSlug,
    errors,
    result,
    action,
    pending,
    changeContent,
    changeSlug,
    handleSubmit,
  };
}
