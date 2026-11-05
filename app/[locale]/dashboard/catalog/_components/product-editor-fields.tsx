"use client";

import { type ReactNode } from "react";
import { type ProductActionResult } from "../product-action-model";
import { type FieldCopy, type ProductLabels } from "./product-labels";
import { DashboardButton } from "./product-editor-draft";

export function Field({
  id,
  copy,
  error,
  children,
}: {
  id: string;
  copy: FieldCopy;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-catalog-field">
      <div className="dashboard-catalog-field-heading">
        <label htmlFor={id}>{copy.label}</label>
      </div>
      {children}
      <small id={`${id}-help`}>{copy.help}</small>
      {error ? (
        <small
          id={`${id}-error`}
          className="dashboard-catalog-field-error"
          role="alert"
        >
          {error}
        </small>
      ) : null}
    </div>
  );
}

export function fieldAria(id: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${id}-help${error ? ` ${id}-error` : ""}`,
  };
}

export function ResultMessage({
  result,
  labels,
  reload,
}: {
  result: ProductActionResult;
  labels: ProductLabels;
  reload: () => void;
}) {
  if (result.status === "idle" || !result.code) return null;
  return (
    <div
      className="dashboard-catalog-action-message"
      data-status={result.status}
      role={result.status === "error" ? "alert" : "status"}
    >
      <p>{labels.results[result.code] ?? labels.validation.invalid}</p>
      {result.code === "STALE" ? (
        <DashboardButton type="button" onClick={reload}>
          {labels.actions.reload}
        </DashboardButton>
      ) : null}
    </div>
  );
}
