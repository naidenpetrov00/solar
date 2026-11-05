"use server";

import { replaceCatalogCategorySpecifications } from "@/lib/catalog/management-category-specification-write";
import { catalogLocales, isUuid } from "@/lib/catalog/model";
import {
  actionLocale,
  errorResult,
  isValidTimestamp,
  requireCatalogManager,
  revalidateCatalog,
  stringValue,
  stringValues,
} from "./category-action-context";
import type { CatalogActionResult } from "./category-action-model";
import { parseSpecifications } from "./category-action-specification-parser";

export async function saveCatalogCategorySpecificationsAction(
  _previous: CatalogActionResult,
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const categoryId = stringValue(formData, "categoryId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const specifications = parseSpecifications(
    stringValue(formData, "specifications"),
  );
  const fieldErrors: Record<string, string> = {};

  specifications?.forEach((specification, specificationIndex) => {
    for (const contentLocale of catalogLocales) {
      if (
        !specification.translations.some(
          (translation) =>
            translation.locale === contentLocale && translation.label.trim(),
        )
      ) {
        fieldErrors[
          `specifications.${specificationIndex}.translations.${contentLocale}`
        ] = "REQUIRED";
      }
    }

    if (
      specification.valueType === "selection" &&
      specification.options.length === 0
    ) {
      fieldErrors[`specifications.${specificationIndex}.options`] = "REQUIRED";
    }

    specification.options.forEach((option, optionIndex) => {
      for (const contentLocale of catalogLocales) {
        if (
          !option.translations.some(
            (translation) =>
              translation.locale === contentLocale && translation.label.trim(),
          )
        ) {
          fieldErrors[
            `specifications.${specificationIndex}.options.${optionIndex}.translations.${contentLocale}`
          ] = "REQUIRED";
        }
      }
    });
  });

  if (
    !locale ||
    !isUuid(categoryId) ||
    !isValidTimestamp(expectedUpdatedAt) ||
    !specifications ||
    Object.keys(fieldErrors).length > 0
  ) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      values,
      fieldErrors,
    };
  }

  try {
    const actor = await requireCatalogManager();
    const saved = await replaceCatalogCategorySpecifications({
      actorId: actor.id,
      categoryId,
      expectedUpdatedAt,
      specifications,
    });
    revalidateCatalog(locale);
    return {
      status: "success",
      code: "SAVED",
      targetId: categoryId,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return errorResult(error, values, fieldErrors);
  }
}
