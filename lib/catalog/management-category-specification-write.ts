import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategory,
  catalogSpecification,
  catalogSpecificationOption,
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
import { assertCompleteEditorSpecifications } from "@/lib/catalog/management-category-specifications";
import { resolveCategorySpecifications } from "@/lib/catalog/management-category-specification-resolve";
import { assertSpecificationChangesAllowed } from "@/lib/catalog/management-category-specification-guard";
import { persistCategorySpecifications } from "@/lib/catalog/management-category-specification-persist";

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
      .select({
        id: catalogSpecification.id,
        key: catalogSpecification.key,
        valueType: catalogSpecification.valueType,
      })
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
    }

    await assertSpecificationChangesAllowed(
      transaction,
      category,
      existingSpecifications,
      existingOptions,
      specifications,
    );
    await persistCategorySpecifications(
      transaction,
      category.id,
      existingIds,
      existingOptions,
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
