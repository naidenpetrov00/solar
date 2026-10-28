import "server-only";

import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
} from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import type { PersistedNormalizedCatalogSpecification } from "./management-category-specifications";

type ExistingOption = { id: string; specificationId: string };

export async function persistCategorySpecificationOptions(
  transaction: CatalogTransaction,
  specification: PersistedNormalizedCatalogSpecification,
  existingOptions: ExistingOption[],
) {
  const specificationId = specification.id!;
  const current = existingOptions.filter(
    (option) => option.specificationId === specificationId,
  );
  const retainedIds = new Set(
    specification.options.flatMap(({ id }) => (id ? [id] : [])),
  );
  const removedIds = current.flatMap(({ id }) =>
    retainedIds.has(id) ? [] : [id],
  );

  if (removedIds.length) {
    await transaction
      .delete(catalogSpecificationOptionTranslation)
      .where(inArray(catalogSpecificationOptionTranslation.optionId, removedIds));
    await transaction
      .delete(catalogSpecificationOption)
      .where(inArray(catalogSpecificationOption.id, removedIds));
  }

  for (const option of specification.options) {
    const optionId = option.id ?? randomUUID();
    if (option.id) {
      await transaction
        .update(catalogSpecificationOption)
        .set({ code: option.code, displayOrder: option.displayOrder })
        .where(eq(catalogSpecificationOption.id, optionId));
      await transaction
        .delete(catalogSpecificationOptionTranslation)
        .where(eq(catalogSpecificationOptionTranslation.optionId, optionId));
    } else {
      await transaction.insert(catalogSpecificationOption).values({
        id: optionId,
        specificationId,
        code: option.code,
        displayOrder: option.displayOrder,
      });
    }
    await transaction.insert(catalogSpecificationOptionTranslation).values(
      option.translations.map((translation) => ({ optionId, ...translation })),
    );
  }
}
