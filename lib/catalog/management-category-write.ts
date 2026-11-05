import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogCategory } from "@/db/schema";
import { hasAllCatalogLocales } from "@/lib/catalog/model";
import { validateSlug } from "@/lib/catalog/text-validation";
import { lockCatalogCategory } from "@/lib/catalog/category-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import {
  type CreateCatalogCategoryInput,
  type UpdateCatalogCategoryInput,
} from "@/lib/catalog/management-category-types";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "@/lib/catalog/management-access";
import {
  normalizeCategoryTranslations,
  assertCategorySlugAvailable,
  nextCategorySortOrder,
  categorySlugConstraintLocale,
} from "@/lib/catalog/management-category-input";
import { normalizeSpecifications } from "@/lib/catalog/management-category-specifications";
import {
  assertCategoryExists,
  insertCategoryTranslations,
  insertCategorySpecifications,
} from "@/lib/catalog/management-category-data";

export async function createCatalogCategory(input: CreateCatalogCategoryInput) {
  if (input.parentId) assertIdentifier(input.parentId);
  const bgSlug = validateSlug(input.bgSlug);
  const enSlug = validateSlug(input.enSlug);
  const translations = normalizeCategoryTranslations(input.translations);
  if (!hasAllCatalogLocales(translations)) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  const specifications = normalizeSpecifications(input.specifications ?? []);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    if (input.parentId) {
      await assertCategoryExists(transaction, input.parentId, true);
    }

    await assertCategorySlugAvailable(
      transaction,
      input.parentId ?? null,
      "bg",
      bgSlug,
    );
    await assertCategorySlugAvailable(
      transaction,
      input.parentId ?? null,
      "en",
      enSlug,
    );
    const sortOrder = await nextCategorySortOrder(
      transaction,
      input.parentId ?? null,
    );

    let created: {
      id: string;
      bgSlug: string;
      enSlug: string;
      status: string;
      updatedAt: Date;
    };

    try {
      [created] = await transaction
        .insert(catalogCategory)
        .values({
          parentId: input.parentId ?? null,
          bgSlug,
          enSlug,
          sortOrder,
        })
        .returning({
          id: catalogCategory.id,
          bgSlug: catalogCategory.bgSlug,
          enSlug: catalogCategory.enSlug,
          status: catalogCategory.status,
          updatedAt: catalogCategory.updatedAt,
        });
    } catch (error) {
      const locale = categorySlugConstraintLocale(error);
      if (locale) {
        throw new CatalogManagementError("SLUG_CONFLICT", { locale });
      }

      throw error;
    }

    await insertCategoryTranslations(transaction, created.id, translations);
    await insertCategorySpecifications(transaction, created.id, specifications);

    return { ...created, updatedAt: created.updatedAt.toISOString() };
  });
}

export async function updateCatalogCategory(input: UpdateCatalogCategoryInput) {
  assertIdentifier(input.categoryId);
  const bgSlug = validateSlug(input.bgSlug);
  const enSlug = validateSlug(input.enSlug);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);

    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    if (
      category.publishedAt &&
      (bgSlug !== category.bgSlug || enSlug !== category.enSlug)
    ) {
      throw new CatalogManagementError("SLUG_IMMUTABLE");
    }

    await assertCategorySlugAvailable(
      transaction,
      category.parentId,
      "bg",
      bgSlug,
      category.id,
    );
    await assertCategorySlugAvailable(
      transaction,
      category.parentId,
      "en",
      enSlug,
      category.id,
    );

    const updatedAt = new Date();
    let updated: {
      id: string;
      bgSlug: string;
      enSlug: string;
      status: string;
      updatedAt: Date;
    };

    try {
      [updated] = await transaction
        .update(catalogCategory)
        .set({ bgSlug, enSlug, updatedAt })
        .where(eq(catalogCategory.id, category.id))
        .returning({
          id: catalogCategory.id,
          bgSlug: catalogCategory.bgSlug,
          enSlug: catalogCategory.enSlug,
          status: catalogCategory.status,
          updatedAt: catalogCategory.updatedAt,
        });
    } catch (error) {
      const locale = categorySlugConstraintLocale(error);
      if (locale) {
        throw new CatalogManagementError("SLUG_CONFLICT", { locale });
      }

      throw error;
    }
    return { ...updated, updatedAt: updated.updatedAt.toISOString() };
  });
}
