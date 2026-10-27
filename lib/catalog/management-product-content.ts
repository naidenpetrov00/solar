import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductMedia,
  catalogProductSpecificationValue,
} from "@/db/schema";
import { hasAllCatalogLocales } from "@/lib/catalog/model";
import {
  type CatalogProductMediaInput,
  type CatalogProductSpecificationValueInput,
  type CatalogProductTranslationInput,
} from "@/lib/catalog/catalog-inputs";
import { type CatalogTransaction } from "@/lib/catalog/actor-repository";
import {
  getProductPublicationAggregate,
  lockCatalogProduct,
} from "@/lib/catalog/product-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "@/lib/catalog/management-access";
import { normalizeProductTranslations } from "@/lib/catalog/management-product-input";
import { replaceProductTranslations } from "./management-product-translations";
import {
  getProductAdditionalCategoryIds,
  assertProductCategories,
} from "./management-product-categories";
import { insertProductValues } from "./management-product-values";
import { insertProductMedia } from "./management-product-media-write";
import { assertProductPublishable } from "@/lib/catalog/management-product-readiness";
import { normalizeMedia } from "@/lib/catalog/management-product-media";

export async function replaceCatalogProductTranslations(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  translations: CatalogProductTranslationInput[];
}) {
  assertIdentifier(input.productId);
  const translations = normalizeProductTranslations(input.translations);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);

    if (product.status === "published" && !hasAllCatalogLocales(translations)) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }

    await replaceProductTranslations(transaction, product.id, translations);
    return touchProduct(transaction, product.id);
  });
}

export async function replaceCatalogProductCategories(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  additionalCategoryIds: string[];
}) {
  assertIdentifier(input.productId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);
    const currentAdditionalCategoryIds = await getProductAdditionalCategoryIds(
      transaction,
      product.id,
    );
    const lockCategories = product.status === "published";
    await assertProductCategories(
      transaction,
      product.primaryCategoryId,
      input.additionalCategoryIds,
      lockCategories,
      lockCategories,
      lockCategories ? currentAdditionalCategoryIds : [],
    );
    await transaction
      .delete(catalogProductAdditionalCategory)
      .where(eq(catalogProductAdditionalCategory.productId, product.id));

    if (input.additionalCategoryIds.length > 0) {
      await transaction.insert(catalogProductAdditionalCategory).values(
        input.additionalCategoryIds.map((categoryId) => ({
          productId: product.id,
          categoryId,
        })),
      );
    }

    return touchProduct(transaction, product.id);
  });
}

export async function replaceCatalogProductSpecificationValues(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  values: CatalogProductSpecificationValueInput[];
}) {
  assertIdentifier(input.productId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);
    await transaction
      .delete(catalogProductSpecificationValue)
      .where(eq(catalogProductSpecificationValue.productId, product.id));
    await insertProductValues(
      transaction,
      product.id,
      product.primaryCategoryId,
      input.values,
    );

    if (product.status === "published") {
      const aggregate = await getProductPublicationAggregate(
        transaction,
        product.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
    }

    return touchProduct(transaction, product.id);
  });
}

export async function replaceCatalogProductMedia(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  media: CatalogProductMediaInput[];
}) {
  assertIdentifier(input.productId);
  const media = normalizeMedia(input.media);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);

    if (
      product.status === "published" &&
      (media.length === 0 ||
        media.filter(({ isPrimary }) => isPrimary).length !== 1 ||
        media.some((item) => !hasAllCatalogLocales(item.translations)))
    ) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }

    await transaction
      .delete(catalogProductMedia)
      .where(eq(catalogProductMedia.productId, product.id));
    await insertProductMedia(transaction, product.id, media);
    return touchProduct(transaction, product.id);
  });
}

async function touchProduct(
  transaction: CatalogTransaction,
  productId: string,
) {
  const updatedAt = new Date();
  await transaction
    .update(catalogProduct)
    .set({ updatedAt })
    .where(eq(catalogProduct.id, productId));
  return { id: productId, updatedAt: updatedAt.toISOString() };
}
