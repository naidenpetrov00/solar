"use server";

import { replaceCatalogCategoryTranslations } from "@/lib/catalog/management-category-translations";
import { updateCatalogCategory } from "@/lib/catalog/management-category-write";
import { catalogLocales, isUuid } from "@/lib/catalog/model";
import {
  actionLocale,
  errorResult,
  isValidSlug,
  isValidTimestamp,
  requireCatalogManager,
  revalidateCatalog,
  stringValue,
  stringValues,
} from "./category-action-context";
import type { CatalogActionResult } from "./category-action-model";

export async function saveCatalogCategoryGeneralAction(
  _previous: CatalogActionResult,
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const categoryId = stringValue(formData, "categoryId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const bgSlug = stringValue(formData, "bgSlug");
  const enSlug = stringValue(formData, "enSlug");
  const fieldErrors: Record<string, string> = {};

  if (!isValidSlug(bgSlug))
    fieldErrors.bgSlug = bgSlug ? "INVALID" : "REQUIRED";
  if (!isValidSlug(enSlug))
    fieldErrors.enSlug = enSlug ? "INVALID" : "REQUIRED";

  if (
    !locale ||
    !isUuid(categoryId) ||
    !isValidTimestamp(expectedUpdatedAt) ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
  }

  try {
    const actor = await requireCatalogManager();
    const saved = await updateCatalogCategory({
      actorId: actor.id,
      categoryId,
      expectedUpdatedAt,
      bgSlug,
      enSlug,
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

export async function saveCatalogCategoryTranslationsAction(
  _previous: CatalogActionResult,
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const categoryId = stringValue(formData, "categoryId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const fieldErrors: Record<string, string> = {};
  const translations = catalogLocales.map((contentLocale) => {
    const prefix = `content.${contentLocale}`;
    const name = stringValue(formData, `${prefix}.name`);
    const introduction = stringValue(formData, `${prefix}.introduction`);
    const metaDescription = stringValue(formData, `${prefix}.metaDescription`);
    const productTitleGuidance = stringValue(
      formData,
      `${prefix}.productTitleGuidance`,
    );
    if (!name.trim()) fieldErrors[`${prefix}.name`] = "REQUIRED";
    if (!introduction.trim()) {
      fieldErrors[`${prefix}.introduction`] = "REQUIRED";
    }

    return {
      locale: contentLocale,
      name,
      introduction,
      metaDescription,
      productTitleGuidance,
    };
  });

  if (
    !locale ||
    !isUuid(categoryId) ||
    !isValidTimestamp(expectedUpdatedAt) ||
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
    const saved = await replaceCatalogCategoryTranslations({
      actorId: actor.id,
      categoryId,
      expectedUpdatedAt,
      translations,
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
