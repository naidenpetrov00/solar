import "server-only";
import { db } from "@/db";
import { catalogProduct, catalogProductAdditionalCategory } from "@/db/schema";
import {
  normalizeBrand,
  normalizeRequiredText,
  validateSlug,
} from "./text-validation";
import { validateCommerceInput } from "./commerce";
import { CatalogManagementError } from "./management-errors";
import type { CreateCatalogProductInput } from "./management-product-types";
import { assertIdentifier, assertCatalogActor } from "./management-access";
import {
  normalizeOptionalProductSlug,
  normalizeProductTranslations,
  normalizeProductSpecificationConfiguration,
  assertProductSpecificationConfiguration,
} from "./management-product-input";
import { assertProductCategories } from "./management-product-categories";
import { replaceProductTranslations } from "./management-product-translations";
import { insertProductValues } from "./management-product-values";
export async function createCatalogProduct(input: CreateCatalogProductInput) {
  assertIdentifier(input.primaryCategoryId);
  const brand = normalizeBrand(input.brand);
  const bgSlug = validateSlug(input.bgSlug);
  const enSlug = validateSlug(input.enSlug);
  const trSlug = normalizeOptionalProductSlug(input.trSlug);
  const ukSlug = normalizeOptionalProductSlug(input.ukSlug);
  const mpn = normalizeRequiredText(input.mpn, 100);
  validateCommerceInput(input);
  const translations = normalizeProductTranslations(input.translations ?? []);
  if (!translations.find(({ locale }) => locale === "bg")?.title) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  const specificationConfiguration = normalizeProductSpecificationConfiguration(
    input.specificationConfiguration ?? {
      excludedSpecificationIds: [],
      customSpecifications: [],
    },
  );
  const additionalCategoryIds = input.additionalCategoryIds ?? [];

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    await assertProductCategories(
      transaction,
      input.primaryCategoryId,
      additionalCategoryIds,
      false,
      true,
    );
    await assertProductSpecificationConfiguration(
      transaction,
      input.primaryCategoryId,
      specificationConfiguration,
    );
    if (
      (input.specificationValues ?? []).some(({ specificationId }) =>
        specificationConfiguration.excludedSpecificationIds.includes(
          specificationId,
        ),
      )
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    const [created] = await transaction
      .insert(catalogProduct)
      .values({
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
      })
      .returning({
        id: catalogProduct.id,
        sku: catalogProduct.sku,
        bgSlug: catalogProduct.bgSlug,
        enSlug: catalogProduct.enSlug,
        trSlug: catalogProduct.trSlug,
        ukSlug: catalogProduct.ukSlug,
        status: catalogProduct.status,
        updatedAt: catalogProduct.updatedAt,
      });

    if (additionalCategoryIds.length > 0) {
      await transaction.insert(catalogProductAdditionalCategory).values(
        additionalCategoryIds.map((categoryId) => ({
          productId: created.id,
          categoryId,
        })),
      );
    }

    await replaceProductTranslations(transaction, created.id, translations);
    await insertProductValues(
      transaction,
      created.id,
      input.primaryCategoryId,
      input.specificationValues ?? [],
    );
    return { ...created, updatedAt: created.updatedAt.toISOString() };
  });
}
