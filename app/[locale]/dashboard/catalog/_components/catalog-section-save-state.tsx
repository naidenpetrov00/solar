"use client";

import type { CatalogActionResult } from "../category-action-model";

export type CatalogSectionSaveCopy = {
  unchanged: string;
  unsaved: string;
  saving: string;
  saved: string;
  unsavedLabel: string;
};

export function CatalogSectionSaveState({
  id,
  isDirty,
  pending,
  result,
  copy,
}: {
  id: string;
  isDirty: boolean;
  pending: boolean;
  result: CatalogActionResult;
  copy: CatalogSectionSaveCopy;
}) {
  const state = pending
    ? "saving"
    : isDirty
      ? "unsaved"
      : result.status === "success"
        ? "saved"
        : "unchanged";

  return (
    <p
      id={id}
      className="dashboard-catalog-section-save-state"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {copy[state]}
    </p>
  );
}
