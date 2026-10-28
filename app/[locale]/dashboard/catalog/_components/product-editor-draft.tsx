"use client";

import { type ComponentProps } from "react";
import { Button } from "@/components/button";
import { type ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import {
  catalogLocales,
  type CatalogLocale,
  type CatalogPriceEntryBasis,
} from "@/lib/catalog/model";
import { catalogSlugFromName } from "@/lib/catalog/text-validation";
import {
  type ProductTranslationDraft,
  type MediaDraft,
} from "./product-editor-model";

export const DashboardButton = ({
  variant,
  ...props
}: ComponentProps<typeof Button>) => (
  <Button
    {...props}
    variant={variant ?? (props.type === "submit" ? "primary" : "secondary")}
  />
);

export function emptyLocalizedText() {
  return Object.fromEntries(
    catalogLocales.map((locale) => [locale, ""]),
  ) as Record<CatalogLocale, string>;
}

function emptyTranslations() {
  return Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      {
        title: "",
        shortDescription: "",
        fullDescription: "",
        marketingLabel: "",
        seoTitle: "",
        metaDescription: "",
      },
    ]),
  ) as Record<CatalogLocale, ProductTranslationDraft>;
}

export function translationsFromDetail(
  detail: ManagedCatalogProductDetail | null,
) {
  const drafts = emptyTranslations();
  for (const translation of detail?.translations ?? []) {
    drafts[translation.locale] = {
      title: translation.title,
      shortDescription: translation.shortDescription,
      fullDescription: translation.fullDescription,
      marketingLabel: translation.marketingLabel ?? "",
      seoTitle: translation.seoTitle ?? "",
      metaDescription: translation.metaDescription ?? "",
    };
  }
  return drafts;
}

export function mediaFromDetail(detail: ManagedCatalogProductDetail | null) {
  return (detail?.media ?? []).map((item): MediaDraft => ({
    clientId: item.id,
    reference: item.reference,
    isPrimary: item.isPrimary,
    isSocialImage: item.isSocialImage,
    translations: Object.fromEntries(
      catalogLocales.map((locale) => [
        locale,
        item.translations.find((translation) => translation.locale === locale)
          ?.altText ?? "",
      ]),
    ) as Record<CatalogLocale, string>,
  }));
}

export function safeSlug(value: string) {
  try {
    return catalogSlugFromName(value);
  } catch {
    return "";
  }
}

export function minorToInput(value: string | null) {
  if (!value) return "";
  const minor = BigInt(value);
  return `${minor / BigInt(100)}.${String(minor % BigInt(100)).padStart(2, "0")}`;
}

export function priceCounterpart(value: string, basis: CatalogPriceEntryBasis) {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (minor <= BigInt(0)) return null;
  const counterpart =
    basis === "vat_inclusive"
      ? (minor * BigInt(100) + BigInt(60)) / BigInt(120)
      : (minor * BigInt(120) + BigInt(50)) / BigInt(100);
  return `${counterpart / BigInt(100)}.${String(counterpart % BigInt(100)).padStart(2, "0")}`;
}
