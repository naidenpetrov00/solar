"use client";

import { useState } from "react";
import type { ManagedPromotionDetail } from "@/lib/catalog/management-promotion-types";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type {
  PromotionDiscountType,
  PromotionScope,
} from "@/lib/catalog/promotion-model";

export type PromotionEditorDraft = {
  internalName: string;
  labels: Record<CatalogLocale, string>;
  discountType: PromotionDiscountType;
  discountValue: string;
  scope: PromotionScope;
  categoryIds: string[];
  productIds: string[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

function formattedValue(detail: ManagedPromotionDetail | null) {
  if (!detail) return "";
  const raw = BigInt(detail.value);
  return `${raw / BigInt(100)}.${String(raw % BigInt(100)).padStart(2, "0")}`;
}

function initialDraft(detail: ManagedPromotionDetail | null): PromotionEditorDraft {
  return {
    internalName: detail?.internalName ?? "",
    labels: Object.fromEntries(
      catalogLocales.map((locale) => [
        locale,
        detail?.translations.find((translation) => translation.locale === locale)
          ?.publicLabel ?? "",
      ]),
    ) as Record<CatalogLocale, string>,
    discountType: detail?.discountType ?? "percentage",
    discountValue: formattedValue(detail),
    scope: detail?.scope ?? "catalog",
    categoryIds: detail?.categoryIds ?? [],
    productIds: detail?.productIds ?? [],
    startsAt: detail?.startsAt?.slice(0, 16) ?? "",
    endsAt: detail?.endsAt?.slice(0, 16) ?? "",
    isActive: detail?.isActive ?? false,
  };
}

export function usePromotionEditorDraft(
  detail: ManagedPromotionDetail | null,
  onDirty: () => void,
) {
  const [draft, setDraft] = useState(() => initialDraft(detail));

  const update = <Key extends keyof PromotionEditorDraft>(
    key: Key,
    value: PromotionEditorDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    onDirty();
  };

  const updateLabel = (locale: CatalogLocale, value: string) => {
    setDraft((current) => ({
      ...current,
      labels: { ...current.labels, [locale]: value },
    }));
    onDirty();
  };

  const toggleTarget = (
    kind: "category" | "product",
    id: string,
    selected: boolean,
  ) => {
    const key = kind === "category" ? "categoryIds" : "productIds";
    setDraft((current) => ({
      ...current,
      [key]: selected
        ? [...current[key], id]
        : current[key].filter((candidate) => candidate !== id),
    }));
    onDirty();
  };

  return { draft, update, updateLabel, toggleTarget };
}
