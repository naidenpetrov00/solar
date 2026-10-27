import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogCategory, catalogCategoryTranslation } from "@/db/schema";
import { hasAllCatalogLocales } from "@/lib/catalog/model";
import type { CatalogCategoryTranslationInput } from "@/lib/catalog/catalog-inputs";
import { lockCatalogCategory } from "@/lib/catalog/category-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "@/lib/catalog/management-access";
import { normalizeCategoryTranslations } from "@/lib/catalog/management-category-input";
import { insertCategoryTranslations } from "@/lib/catalog/management-category-data";

export async function replaceCatalogCategoryTranslations(input: {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  translations: CatalogCategoryTranslationInput[];
}) {
  assertIdentifier(input.categoryId);
  const translations = normalizeCategoryTranslations(input.translations);
  if (!hasAllCatalogLocales(translations)) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    const existingTranslations = await transaction
      .select()
      .from(catalogCategoryTranslation)
      .where(eq(catalogCategoryTranslation.categoryId, category.id));
    const existingByLocale = new Map(
      existingTranslations.map((translation) => [
        translation.locale,
        translation,
      ]),
    );
    const submittedByLocale = new Map(
      input.translations.map((translation) => [
        translation.locale,
        translation,
      ]),
    );
    const translationsToPersist = translations.map((translation) => {
      const existing = existingByLocale.get(translation.locale);
      const submitted = submittedByLocale.get(translation.locale);

      return {
        ...translation,
        detailedContent:
          submitted?.detailedContent === undefined
            ? (existing?.detailedContent ?? null)
            : translation.detailedContent,
        seoTitle:
          submitted?.seoTitle === undefined
            ? (existing?.seoTitle ?? null)
            : translation.seoTitle,
      };
    });

    await transaction
      .delete(catalogCategoryTranslation)
      .where(eq(catalogCategoryTranslation.categoryId, category.id));
    await insertCategoryTranslations(
      transaction,
      category.id,
      translationsToPersist,
    );
    const updatedAt = new Date();
    await transaction
      .update(catalogCategory)
      .set({ updatedAt })
      .where(eq(catalogCategory.id, category.id));
    return { id: category.id, updatedAt: updatedAt.toISOString() };
  });
}
