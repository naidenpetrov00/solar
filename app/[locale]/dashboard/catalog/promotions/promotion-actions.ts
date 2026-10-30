"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permission-policy";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  createPromotion,
  updatePromotion,
} from "@/lib/catalog/management-promotion-write";
import { catalogLocales, isUuid } from "@/lib/catalog/model";
import {
  isPromotionScope,
  type PromotionInput,
} from "@/lib/catalog/promotion-model";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidation";
import {
  dashboardPromotionsRouteSlug,
  localizedPath,
  supportedLocales,
  type SupportedLocale,
} from "../../../_lib/routes";
import type { PromotionActionResult } from "./promotion-action-model";

function value(data: FormData, key: string) {
  const entry = data.get(key);
  return typeof entry === "string" ? entry : "";
}

function ids(data: FormData, key: string) {
  return data
    .getAll(key)
    .filter((entry): entry is string => typeof entry === "string");
}

function minorUnits(raw: string) {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return result > BigInt(0) && result <= BigInt("9223372036854775807")
    ? result
    : null;
}

function percentageBasisPoints(raw: string) {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return result >= 1 && result <= 9999 ? result : null;
}

function utcDate(raw: string) {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(raw)) return undefined;
  const parsed = new Date(`${raw}:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 16) === raw
    ? parsed
    : undefined;
}

function parseInput(data: FormData) {
  const errors: Record<string, string> = {};
  const internalName = value(data, "internalName").trim();
  const discountType = value(data, "discountType");
  const scopeValue = value(data, "scope");
  const categoryIds = ids(data, "categoryIds");
  const productIds = ids(data, "productIds");
  const startsAt = utcDate(value(data, "startsAt"));
  const endsAt = utcDate(value(data, "endsAt"));
  if (!internalName || internalName.length > 200) errors.internalName = "INVALID";
  if (!isPromotionScope(scopeValue)) errors.scope = "INVALID";
  if (new Set(categoryIds).size !== categoryIds.length || categoryIds.some((id) => !isUuid(id))) errors.categoryIds = "INVALID";
  if (new Set(productIds).size !== productIds.length || productIds.some((id) => !isUuid(id))) errors.productIds = "INVALID";
  if (scopeValue === "category" && !categoryIds.length) errors.categoryIds = "REQUIRED";
  if (scopeValue === "product" && !productIds.length) errors.productIds = "REQUIRED";
  if (startsAt === undefined) errors.startsAt = "INVALID";
  if (endsAt === undefined) errors.endsAt = "INVALID";
  if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = "INVALID";
  for (const locale of catalogLocales) {
    if (value(data, `label.${locale}`).trim().length > 200) {
      errors[`label.${locale}`] = "INVALID";
    }
  }
  const percentage = percentageBasisPoints(value(data, "discountValue"));
  const fixed = minorUnits(value(data, "discountValue"));
  if ((discountType === "percentage" && percentage === null) || (discountType === "fixed_eur" && fixed === null) || !["percentage", "fixed_eur"].includes(discountType)) errors.discountValue = "INVALID";
  const common = {
    internalName,
    scope: isPromotionScope(scopeValue) ? scopeValue : "catalog",
    categoryIds: scopeValue === "category" ? categoryIds : [],
    productIds: scopeValue === "product" ? productIds : [],
    isActive: value(data, "isActive") === "true",
    startsAt: startsAt ?? null,
    endsAt: endsAt ?? null,
    translations: catalogLocales.map((locale) => ({
      locale,
      publicLabel: value(data, `label.${locale}`).trim() || null,
    })),
  };
  const input: PromotionInput = discountType === "fixed_eur"
    ? { ...common, discountType, percentageBasisPoints: null, fixedVatInclusiveMinor: fixed ?? BigInt(0) }
    : { ...common, discountType: "percentage", percentageBasisPoints: percentage ?? 0, fixedVatInclusiveMinor: null };
  return { input, errors };
}

export async function savePromotionAction(
  _previous: PromotionActionResult,
  data: FormData,
): Promise<PromotionActionResult> {
  const localeValue = value(data, "locale");
  const locale = supportedLocales.includes(localeValue as SupportedLocale)
    ? (localeValue as SupportedLocale)
    : null;
  const promotionId = value(data, "promotionId");
  const expectedUpdatedAt = value(data, "expectedUpdatedAt");
  const { input, errors } = parseInput(data);
  if (!locale || Object.keys(errors).length || (promotionId && (!isUuid(promotionId) || !Number.isFinite(Date.parse(expectedUpdatedAt))))) {
    return { status: "error", code: "INVALID_INPUT", fieldErrors: errors };
  }
  try {
    const actor = await requireUser();
    if (!hasPermission(actor.role, "catalog:manage")) return { status: "error", code: "FORBIDDEN" };
    const saved = promotionId
      ? await updatePromotion({ actorId: actor.id, promotionId, expectedUpdatedAt, ...input })
      : await createPromotion({ actorId: actor.id, ...input });
    for (const siteLocale of supportedLocales) {
      revalidatePath(
        localizedPath(siteLocale, dashboardPromotionsRouteSlug),
      );
    }
    revalidatePublicCatalog();
    return { status: "success", code: promotionId ? "SAVED" : "CREATED", targetId: saved.id, updatedAt: saved.updatedAt };
  } catch (error) {
    if (error instanceof CatalogManagementError) {
      const code = error.code === "STALE" || error.code === "NOT_FOUND" || error.code === "FORBIDDEN" ? error.code : "INVALID_INPUT";
      return { status: "error", code };
    }
    throw error;
  }
}
