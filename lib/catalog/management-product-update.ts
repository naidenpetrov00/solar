import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductSpecificationValue,
} from "@/db/schema";
import {
  normalizeBrand,
  normalizeRequiredText,
  validateSlug,
} from "./text-validation";
import { validateCommerceInput } from "./commerce";
import {
  getProductPublicationAggregate,
  lockCatalogProduct,
} from "./product-repository";
import { CatalogManagementError } from "./management-errors";
import type { UpdateCatalogProductInput } from "./management-product-types";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "./management-access";
import {
  normalizeOptionalProductSlug,
  normalizeProductTranslations,
  normalizeProductSpecificationConfiguration,
  assertProductSpecificationConfiguration,
} from "./management-product-input";
import {
  assertProductCategories,
  assertProductCategoryChange,
  getProductAdditionalCategoryIds,
} from "./management-product-categories";
import { replaceProductTranslations } from "./management-product-translations";
import { insertProductValues } from "./management-product-values";
import { assertProductPublishable } from "./management-product-readiness";
export async function updateCatalogProduct(input: UpdateCatalogProductInput) {
  assertIdentifier(input.productId);
  assertIdentifier(input.primaryCategoryId);
  const brand = normalizeBrand(input.brand);
  const bgSlug = validateSlug(input.bgSlug);
  const enSlug = validateSlug(input.enSlug);
  const trSlug = normalizeOptionalProductSlug(input.trSlug);
  const ukSlug = normalizeOptionalProductSlug(input.ukSlug);
  const mpn = normalizeRequiredText(input.mpn, 100);
  validateCommerceInput(input);
  const translations = normalizeProductTranslations(input.translations);
  if (!translations.find(({ locale }) => locale === "bg")?.title) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  const specificationConfiguration = normalizeProductSpecificationConfiguration(
    input.specificationConfiguration,
  );

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);

    if (
      product.publishedAt &&
      (bgSlug !== product.bgSlug ||
        enSlug !== product.enSlug ||
        trSlug !== product.trSlug ||
        ukSlug !== product.ukSlug)
    ) {
      throw new CatalogManagementError("SLUG_IMMUTABLE");
    }

    await assertProductCategoryChange(
      transaction,
      product,
      input.primaryCategoryId,
      input.discardSpecificationValues,
    );

    const currentAdditionalCategoryIds = await getProductAdditionalCategoryIds(
      transaction,
      product.id,
    );
    const additionalCategoryIds =
      input.additionalCategoryIds ?? currentAdditionalCategoryIds;
    const lockCategories = product.status === "published";
    await assertProductCategories(
      transaction,
      input.primaryCategoryId,
      additionalCategoryIds,
      lockCategories,
      lockCategories,
      lockCategories
        ? [product.primaryCategoryId, ...currentAdditionalCategoryIds]
        : [],
    );
    await assertProductSpecificationConfiguration(
      transaction,
      input.primaryCategoryId,
      specificationConfiguration,
    );
    if (
      input.specificationValues.some(({ specificationId }) =>
        specificationConfiguration.excludedSpecificationIds.includes(
          specificationId,
        ),
      )
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }
    await transaction
      .delete(catalogProductSpecificationValue)
      .where(eq(catalogProductSpecificationValue.productId, product.id));
    const updatedAt = new Date();
    const [updated] = await transaction
      .update(catalogProduct)
      .set({
        brand,
        bgSlug,
        enSlug,
        trSlug,
        ukSlug,
        salesMode: input.salesMode,
        primaryCategoryId: input.primaryCategoryId,
        availability: input.availability,
        mpn,
        specificationConfiguration,
        pricePresentation: input.price.presentation,
        priceEntryBasis: input.price.entryBasis,
        priceInputMinor: input.price.inputMinor,
        updatedAt,
      })
      .where(eq(catalogProduct.id, product.id))
      .returning({
        id: catalogProduct.id,
        sku: catalogProduct.sku,
        status: catalogProduct.status,
        updatedAt: catalogProduct.updatedAt,
      });

    await transaction
      .delete(catalogProductAdditionalCategory)
      .where(eq(catalogProductAdditionalCategory.productId, product.id));
    if (additionalCategoryIds.length > 0) {
      await transaction.insert(catalogProductAdditionalCategory).values(
        additionalCategoryIds.map((categoryId) => ({
          productId: product.id,
          categoryId,
        })),
      );
    }
    await insertProductValues(
      transaction,
      product.id,
      input.primaryCategoryId,
      input.specificationValues,
    );
    await replaceProductTranslations(transaction, product.id, translations);
    if (product.status === "published") {
      const aggregate = await getProductPublicationAggregate(
        transaction,
        product.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
    }

    return { ...updated, updatedAt: updated.updatedAt.toISOString() };
  });
}
