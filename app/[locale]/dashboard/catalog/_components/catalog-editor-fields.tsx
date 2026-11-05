"use client";

import { type ReactNode } from "react";
import type { CatalogActionResult } from "../category-action-model";
import { type CatalogLabels } from "./catalog-labels";
import { DashboardButton } from "./catalog-editor-actions";
import { type FieldCopy } from "./catalog-editor-model";

export function ResultMessage({
  result,
  labels,
  onReload,
}: {
  result: CatalogActionResult;
  labels: CatalogLabels;
  onReload?: () => void;
}) {
  if (!result.code || result.status === "idle") return null;

  return (
    <div
      className="dashboard-catalog-result"
      data-tone={result.status}
      role={result.status === "error" ? "alert" : "status"}
      aria-live={result.status === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <p>{labels.results[result.code]}</p>
      {result.code === "STALE" && onReload ? (
        <DashboardButton type="button" onClick={onReload}>
          {labels.actions.reload}
        </DashboardButton>
      ) : null}
    </div>
  );
}

export function CharacterCount({
  value,
  maximum,
}: {
  value: string;
  maximum: number;
}) {
  return (
    <span className="dashboard-catalog-character-count" aria-live="polite">
      {Array.from(value).length} / {maximum}
    </span>
  );
}

export function Field({
  id,
  copy,
  count,
  error,
  children,
}: {
  id: string;
  copy: FieldCopy;
  count?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className="dashboard-catalog-field">
      <div className="dashboard-catalog-field-heading">
        <label htmlFor={id}>{copy.label}</label>
        {count}
      </div>
      <p id={helpId} className="dashboard-catalog-help">
        {copy.help}
        {copy.example ? (
          <span className="dashboard-catalog-help-example">{copy.example}</span>
        ) : null}
      </p>
      {children}
      {error ? (
        <p id={errorId} className="dashboard-catalog-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
