import type { CatalogLocale } from "@/lib/catalog/model";
import type { PromotionActionCode } from "../promotion-action-model";

export type PromotionLabels = {
  title: string;
  description: string;
  listLabel: string;
  newPromotion: string;
  empty: string;
  readOnly: string;
  noSelectionTitle: string;
  noSelectionDescription: string;
  fields: Record<
    | "internalName"
    | "publicLabel"
    | "discountType"
    | "discountValue"
    | "scope"
    | "categories"
    | "products"
    | "isActive"
    | "startsAt"
    | "endsAt",
    { label: string; help: string }
  >;
  discountTypes: Record<"percentage" | "fixed_eur", string>;
  scopes: Record<"catalog" | "category" | "product", string>;
  statuses: Record<"inactive" | "scheduled" | "active" | "ended", string>;
  salesModes: Record<"direct_purchase" | "enquiry", string>;
  catalogStatuses: Record<"draft" | "published" | "archived", string>;
  actions: { save: string; saving: string; reload: string };
  results: Record<PromotionActionCode, string>;
  validation: { summary: string; invalid: string; required: string };
  languages: Record<CatalogLocale, string>;
  localeSwitch: { label: string; set: string; empty: string };
  targetCount: string;
  lastUpdated: string;
  unsavedChanges: string;
};
