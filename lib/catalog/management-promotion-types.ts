import type { CatalogLocale, CatalogSalesMode, CatalogStatus } from "./model";
import type { PromotionInput, PromotionScope } from "./promotion-model";

export type ManagedPromotionSummary = {
  id: string;
  internalName: string;
  discountType: "percentage" | "fixed_eur";
  value: string;
  scope: PromotionScope;
  targetCount: number;
  status: "inactive" | "scheduled" | "active" | "ended";
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export type ManagedPromotionDetail = ManagedPromotionSummary & {
  isActive: boolean;
  translations: Array<{
    locale: CatalogLocale;
    publicLabel: string | null;
  }>;
  categoryIds: string[];
  productIds: string[];
};

export type ManagedPromotionTarget = {
  id: string;
  name: string;
  status: CatalogStatus;
  parentId?: string | null;
  sku?: string;
  salesMode?: CatalogSalesMode;
};

export type ManagedPromotionWorkspace = {
  canManage: boolean;
  promotions: ManagedPromotionSummary[];
  selected: ManagedPromotionDetail | null;
  categories: ManagedPromotionTarget[];
  products: ManagedPromotionTarget[];
};

export type CreatePromotionInput = PromotionInput & { actorId: string };
export type UpdatePromotionInput = PromotionInput & {
  actorId: string;
  promotionId: string;
  expectedUpdatedAt: string;
};
