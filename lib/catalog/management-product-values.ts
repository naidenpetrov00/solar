import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import {
  catalogProductSpecificationValue,
  catalogSpecification,
  catalogSpecificationOption,
} from "@/db/schema";
import { validateDecimal } from "./model";
import { normalizeRequiredText } from "./text-validation";
import type { CatalogProductSpecificationValueInput } from "./catalog-inputs";
import type { CatalogTransaction } from "./actor-repository";
import { CatalogManagementError } from "./management-errors";
import { assertIdentifier } from "./management-access";
export async function insertProductValues(
  transaction: CatalogTransaction,
  productId: string,
  primaryCategoryId: string,
  values: CatalogProductSpecificationValueInput[],
) {
  const specificationIds = values.map(({ specificationId }) => specificationId);

  if (new Set(specificationIds).size !== specificationIds.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  specificationIds.forEach(assertIdentifier);
  const specifications = specificationIds.length
    ? await transaction
        .select({
          id: catalogSpecification.id,
          valueType: catalogSpecification.valueType,
        })
        .from(catalogSpecification)
        .where(
          and(
            eq(catalogSpecification.categoryId, primaryCategoryId),
            inArray(catalogSpecification.id, specificationIds),
          ),
        )
    : [];

  if (specifications.length !== values.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  const specificationById = new Map(
    specifications.map((specification) => [specification.id, specification]),
  );

  for (const value of values) {
    const specification = specificationById.get(value.specificationId);

    if (!specification || specification.valueType !== value.type) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    const row = {
      productId,
      primaryCategoryId,
      specificationId: value.specificationId,
      textValue: null as string | null,
      numberValue: null as string | null,
      booleanValue: null as boolean | null,
      selectionOptionId: null as string | null,
    };

    if (value.type === "text") {
      row.textValue = normalizeRequiredText(value.value, 5000);
    } else if (value.type === "number") {
      row.numberValue = validateDecimal(value.value);
    } else if (value.type === "boolean") {
      row.booleanValue = value.value;
    } else {
      assertIdentifier(value.optionId);
      const [option] = await transaction
        .select({ id: catalogSpecificationOption.id })
        .from(catalogSpecificationOption)
        .where(
          and(
            eq(catalogSpecificationOption.id, value.optionId),
            eq(
              catalogSpecificationOption.specificationId,
              value.specificationId,
            ),
          ),
        )
        .limit(1);
      if (!option) throw new CatalogManagementError("INVALID_INPUT");
      row.selectionOptionId = option.id;
    }

    await transaction.insert(catalogProductSpecificationValue).values(row);
  }
}
