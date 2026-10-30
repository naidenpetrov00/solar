import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategory,
  catalogProduct,
  catalogPromotion,
  catalogPromotionCategory,
  catalogPromotionProduct,
  catalogPromotionTranslation,
} from "@/db/schema";
import { assertCatalogActor, assertFresh, assertIdentifier } from "./management-access";
import { CatalogManagementError } from "./management-errors";
import type {
  CreatePromotionInput,
  UpdatePromotionInput,
} from "./management-promotion-types";
import { catalogLocales, isCatalogLocale } from "./model";
import type { CatalogTransaction } from "./actor-repository";
import type { PromotionInput } from "./promotion-model";

function normalize(input: PromotionInput): PromotionInput {
  const internalName = input.internalName.trim();
  const categoryIds = [...new Set(input.categoryIds)];
  const productIds = [...new Set(input.productIds)];
  if (
    !internalName ||
    internalName.length > 200 ||
    Boolean(input.startsAt && !Number.isFinite(input.startsAt.getTime())) ||
    Boolean(input.endsAt && !Number.isFinite(input.endsAt.getTime())) ||
    (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) ||
    input.translations.length !== catalogLocales.length ||
    new Set(input.translations.map(({ locale }) => locale)).size !==
      catalogLocales.length ||
    input.translations.some(
      ({ locale, publicLabel }) =>
        !isCatalogLocale(locale) ||
        Boolean(publicLabel && publicLabel.trim().length > 200),
    ) ||
    (input.scope === "catalog" && (categoryIds.length || productIds.length)) ||
    (input.scope === "category" && (!categoryIds.length || productIds.length)) ||
    (input.scope === "product" && (!productIds.length || categoryIds.length))
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  if (
    (input.discountType === "percentage" &&
      (!Number.isInteger(input.percentageBasisPoints) ||
        input.percentageBasisPoints < 1 ||
        input.percentageBasisPoints > 9999)) ||
    (input.discountType === "fixed_eur" &&
      (input.fixedVatInclusiveMinor <= BigInt(0) ||
        input.fixedVatInclusiveMinor > BigInt("9223372036854775807")))
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  return {
    ...input,
    internalName,
    categoryIds,
    productIds,
    translations: input.translations.map((translation) => ({
      ...translation,
      publicLabel: translation.publicLabel?.trim() || null,
    })),
  };
}

async function assertTargets(transaction: CatalogTransaction, input: PromotionInput) {
  const targetIds = input.scope === "category" ? input.categoryIds : input.productIds;
  targetIds.forEach(assertIdentifier);
  if (!targetIds.length) return;
  const rows =
    input.scope === "category"
      ? await transaction
          .select({ id: catalogCategory.id })
          .from(catalogCategory)
          .where(inArray(catalogCategory.id, targetIds))
      : await transaction
          .select({ id: catalogProduct.id })
          .from(catalogProduct)
          .where(inArray(catalogProduct.id, targetIds));
  if (rows.length !== targetIds.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}

async function replaceRelations(
  transaction: CatalogTransaction,
  promotionId: string,
  input: PromotionInput,
) {
  await transaction
    .delete(catalogPromotionTranslation)
    .where(eq(catalogPromotionTranslation.promotionId, promotionId));
  await transaction
    .delete(catalogPromotionCategory)
    .where(eq(catalogPromotionCategory.promotionId, promotionId));
  await transaction
    .delete(catalogPromotionProduct)
    .where(eq(catalogPromotionProduct.promotionId, promotionId));
  await transaction.insert(catalogPromotionTranslation).values(
    input.translations.map((translation) => ({ promotionId, ...translation })),
  );
  if (input.scope === "category") {
    await transaction.insert(catalogPromotionCategory).values(
      input.categoryIds.map((categoryId) => ({ promotionId, categoryId })),
    );
  }
  if (input.scope === "product") {
    await transaction.insert(catalogPromotionProduct).values(
      input.productIds.map((productId) => ({ promotionId, productId })),
    );
  }
}

function values(input: PromotionInput) {
  return {
    internalName: input.internalName,
    discountType: input.discountType,
    scope: input.scope,
    percentageBasisPoints: input.percentageBasisPoints,
    fixedVatInclusiveMinor: input.fixedVatInclusiveMinor,
    isActive: input.isActive,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };
}

export async function createPromotion(raw: CreatePromotionInput) {
  const input = normalize(raw);
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, raw.actorId, "catalog:manage");
    await assertTargets(transaction, input);
    const [created] = await transaction
      .insert(catalogPromotion)
      .values(values(input))
      .returning({ id: catalogPromotion.id, updatedAt: catalogPromotion.updatedAt });
    await replaceRelations(transaction, created.id, input);
    return { id: created.id, updatedAt: created.updatedAt.toISOString() };
  });
}

export async function updatePromotion(raw: UpdatePromotionInput) {
  assertIdentifier(raw.promotionId);
  const input = normalize(raw);
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, raw.actorId, "catalog:manage");
    const [current] = await transaction
      .select()
      .from(catalogPromotion)
      .where(eq(catalogPromotion.id, raw.promotionId))
      .for("update");
    if (!current) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(current.updatedAt, raw.expectedUpdatedAt);
    await assertTargets(transaction, input);
    const updatedAt = new Date();
    const [updated] = await transaction
      .update(catalogPromotion)
      .set({ ...values(input), updatedAt })
      .where(eq(catalogPromotion.id, raw.promotionId))
      .returning({ id: catalogPromotion.id, updatedAt: catalogPromotion.updatedAt });
    await replaceRelations(transaction, updated.id, input);
    return { id: updated.id, updatedAt: updated.updatedAt.toISOString() };
  });
}
