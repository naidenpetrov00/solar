"use server";

import { createCatalogCategory } from "@/lib/catalog/management-category-write";
import { catalogLocales, isUuid } from "@/lib/catalog/model";
import {
  actionLocale,
  errorResult,
  isValidSlug,
  requireCatalogManager,
  revalidateCatalog,
  stringValue,
  stringValues,
} from "./category-action-context";
import type { CatalogActionResult } from "./category-action-model";

export async function createCatalogCategoryAction(
  _previous: CatalogActionResult,
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const bgSlug = stringValue(formData, "bgSlug");
  const enSlug = stringValue(formData, "enSlug");
  const parentId = stringValue(formData, "parentId") || null;
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

  if (!isValidSlug(bgSlug))
    fieldErrors.bgSlug = bgSlug ? "INVALID" : "REQUIRED";
  if (!isValidSlug(enSlug))
    fieldErrors.enSlug = enSlug ? "INVALID" : "REQUIRED";

  if (
    !locale ||
    Object.keys(fieldErrors).length > 0 ||
    (parentId !== null && !isUuid(parentId))
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
    const created = await createCatalogCategory({
      actorId: actor.id,
      parentId,
      bgSlug,
      enSlug,
      translations,
    });
    revalidateCatalog(locale);
    return { status: "success", code: "CREATED", targetId: created.id };
  } catch (error) {
    return errorResult(error, values, fieldErrors);
  }
}
