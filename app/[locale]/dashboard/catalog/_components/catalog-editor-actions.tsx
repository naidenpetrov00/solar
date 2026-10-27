"use client";

import { type ComponentProps } from "react";
import { Button } from "@/components/button";
import { type ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { type CatalogLabels } from "./catalog-labels";
import {
  type CategoryContentDraft,
  type CategoryContentDrafts,
} from "./catalog-editor-model";

export const DashboardButton = ({
  variant,
  ...props
}: ComponentProps<typeof Button>) => (
  <Button
    {...props}
    variant={variant ?? (props.type === "submit" ? "primary" : "secondary")}
  />
);

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugErrorLabel(
  code: string | undefined,
  labels: CatalogLabels,
) {
  if (code === "CONFLICT") return labels.validation.conflict;
  if (code === "INVALID") return labels.validation.slug;
  if (code) return labels.validation.required;
  return undefined;
}

export const emptyLocaleLabels = (): Record<CatalogLocale, string> => ({
  bg: "",
  en: "",
  tr: "",
  uk: "",
});

const emptyCategoryContent = (): CategoryContentDraft => ({
  name: "",
  introduction: "",
  metaDescription: "",
  productTitleGuidance: "",
});

export function categoryContentFromDetail(
  detail: ManagedCatalogCategoryDetail,
): CategoryContentDrafts {
  return Object.fromEntries(
    catalogLocales.map((locale) => {
      const translation = detail.translations.find(
        (candidate) => candidate.locale === locale,
      );
      return [
        locale,
        {
          name: translation?.name ?? "",
          introduction: translation?.introduction ?? "",
          metaDescription: translation?.metaDescription ?? "",
          productTitleGuidance: translation?.productTitleGuidance ?? "",
        },
      ];
    }),
  ) as CategoryContentDrafts;
}

export function emptyCategoryContentDrafts(): CategoryContentDrafts {
  return Object.fromEntries(
    catalogLocales.map((locale) => [locale, emptyCategoryContent()]),
  ) as CategoryContentDrafts;
}

export function contentCompletion(
  drafts: CategoryContentDrafts,
): Record<CatalogLocale, boolean> {
  return Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      Boolean(drafts[locale].name.trim() && drafts[locale].introduction.trim()),
    ]),
  ) as Record<CatalogLocale, boolean>;
}

export function effectiveCategorySlug(
  locale: CatalogLocale,
  bgSlug: string,
  enSlug: string,
) {
  return locale === "bg" ? bgSlug : enSlug;
}

export function arrowIcon(direction: "up" | "down" | "back") {
  const path =
    direction === "up"
      ? "M5 12l5-5 5 5"
      : direction === "down"
        ? "M5 8l5 5 5-5"
        : "M16 10H5m4-4-4 4 4 4";

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
