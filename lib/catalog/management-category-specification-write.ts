import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategory,
  catalogProduct,
  catalogProductSpecificationValue,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import { hasAllCatalogLocales } from "@/lib/catalog/model";
import { lockCatalogCategory } from "@/lib/catalog/category-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import type { CatalogSpecificationEditorInput } from "@/lib/catalog/management-category-types";
import {
  assertIdentifier,
  assertCatalogActor,
  assertFresh,
} from "@/lib/catalog/management-access";
import { insertCategorySpecifications } from "@/lib/catalog/management-category-data";
import { assertCompleteEditorSpecifications } from "@/lib/catalog/management-category-specifications";
import { resolveCategorySpecifications } from "@/lib/catalog/management-category-specification-resolve";

export async function replaceCatalogCategorySpecifications(input: {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  specifications: CatalogSpecificationEditorInput[];
}) {
  assertIdentifier(input.categoryId);
  assertCompleteEditorSpecifications(input.specifications);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    const existingSpecifications = await transaction
      .select({ id: catalogSpecification.id, key: catalogSpecification.key })
      .from(catalogSpecification)
      .where(eq(catalogSpecification.categoryId, category.id));
    const existingIds = existingSpecifications.map(({ id }) => id);
    const existingOptions = existingIds.length
      ? await transaction
          .select({
            id: catalogSpecificationOption.id,
            specificationId: catalogSpecificationOption.specificationId,
            code: catalogSpecificationOption.code,
          })
          .from(catalogSpecificationOption)
          .where(
            inArray(catalogSpecificationOption.specificationId, existingIds),
          )
      : [];
    const specifications = resolveCategorySpecifications(
      input.specifications,
      existingSpecifications,
      existingOptions,
    );
    const [dependentValue] = existingIds.length
      ? await transaction
          .select({ productId: catalogProductSpecificationValue.productId })
          .from(catalogProductSpecificationValue)
          .where(
            inArray(
              catalogProductSpecificationValue.specificationId,
              existingIds,
            ),
          )
          .limit(1)
      : [];

    if (dependentValue) {
      throw new CatalogManagementError("DEPENDENCY_EXISTS");
    }

    if (category.status === "published") {
      const complete = specifications.every(
        (specification) =>
          hasAllCatalogLocales(specification.translations) &&
          (specification.valueType !== "selection" ||
            (specification.options.length > 0 &&
              specification.options.every((option) =>
                hasAllCatalogLocales(option.translations),
              ))),
      );

      if (!complete) throw new CatalogManagementError("PUBLICATION_INVALID");

      if (specifications.some(({ isRequired }) => isRequired)) {
        const [publishedProduct] = await transaction
          .select({ id: catalogProduct.id })
          .from(catalogProduct)
          .where(
            and(
              eq(catalogProduct.primaryCategoryId, category.id),
              eq(catalogProduct.status, "published"),
            ),
          )
          .limit(1);

        if (publishedProduct) {
          throw new CatalogManagementError("PUBLICATION_INVALID");
        }
      }
    }

    if (existingIds.length > 0) {
      const optionIds = existingOptions.map(({ id }) => id);

      if (optionIds.length > 0) {
        await transaction
          .delete(catalogSpecificationOptionTranslation)
          .where(
            inArray(catalogSpecificationOptionTranslation.optionId, optionIds),
          );
        await transaction
          .delete(catalogSpecificationOption)
          .where(inArray(catalogSpecificationOption.id, optionIds));
      }

      await transaction
        .delete(catalogSpecificationTranslation)
        .where(
          inArray(catalogSpecificationTranslation.specificationId, existingIds),
        );
      await transaction
        .delete(catalogSpecification)
        .where(inArray(catalogSpecification.id, existingIds));
    }

    await insertCategorySpecifications(
      transaction,
      category.id,
      specifications,
    );
    const updatedAt = new Date();
    await transaction
      .update(catalogCategory)
      .set({ updatedAt })
      .where(eq(catalogCategory.id, category.id));
    return { id: category.id, updatedAt: updatedAt.toISOString() };
  });
}
