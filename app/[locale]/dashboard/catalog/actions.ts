"use server";

import { revalidatePath } from "next/cache";

import { revalidatePublicCatalog } from "@/lib/catalog/revalidation";
import {
  archiveCatalogCategory,
  CatalogManagementError,
  createCatalogCategory,
  moveCatalogCategory,
  publishCatalogCategory,
  reorderCatalogCategories,
  replaceCatalogCategorySpecifications,
  replaceCatalogCategoryTranslations,
  restoreCatalogCategory,
  unpublishCatalogCategory,
  updateCatalogCategory,
  type CatalogCategoryPublicationIssue,
  type CatalogSpecificationEditorInput,
} from "@/lib/catalog/management";
import {
  catalogLocales,
  CatalogValidationError,
  isCatalogLocale,
  isUuid,
} from "@/lib/catalog/model";
import {
  AuthorizationError,
  hasPermission,
  requireUser,
} from "@/lib/authorization";
import {
  dashboardCatalogRouteSlug,
  localizedPath,
  supportedLocales,
  type SupportedLocale,
} from "../../_lib/routes";

export type CatalogActionCode =
  | "ACTIVE_DEPENDENCY_EXISTS"
  | "ARCHIVED_ANCESTOR"
  | "CREATED"
  | "SAVED"
  | "MOVED"
  | "REORDERED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED"
  | "RESTORED"
  | "CYCLE"
  | "DEPENDENCY_EXISTS"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "PUBLICATION_INVALID"
  | "PUBLISHED_DEPENDENCY_EXISTS"
  | "SLUG_CONFLICT"
  | "SLUG_IMMUTABLE"
  | "STALE";

export type CatalogActionResult = {
  status: "idle" | "success" | "error";
  code?: CatalogActionCode;
  targetId?: string;
  updatedAt?: string;
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  publicationIssues?: CatalogCategoryPublicationIssue[];
};

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData) {
  const values: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as readonly string[]).includes(value);
}

function actionLocale(formData: FormData) {
  const locale = stringValue(formData, "locale");
  return isSupportedLocale(locale) ? locale : null;
}

function isValidTimestamp(value: string) {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function hasOnlyKeys(value: object, allowedKeys: readonly string[]) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}

async function requireCatalogManager() {
  const actor = await requireUser();

  if (!hasPermission(actor.role, "catalog:manage")) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }

  return actor;
}

function errorResult(
  error: unknown,
  values?: Record<string, string>,
  fieldErrors?: Record<string, string>,
): CatalogActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN", values, fieldErrors };
  }

  if (error instanceof CatalogManagementError) {
    const slugLocale =
      error.code === "SLUG_CONFLICT" &&
      typeof error.details === "object" &&
      error.details !== null &&
      "locale" in error.details &&
      (error.details.locale === "bg" || error.details.locale === "en")
        ? error.details.locale
        : null;
    return {
      status: "error",
      code: error.code,
      values,
      fieldErrors: slugLocale
        ? { ...fieldErrors, [`${slugLocale}Slug`]: "CONFLICT" }
        : fieldErrors,
      publicationIssues: Array.isArray(error.details)
        ? (error.details as CatalogCategoryPublicationIssue[])
        : undefined,
    };
  }

  if (error instanceof CatalogValidationError) {
    return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
  }

  return { status: "error", code: "INVALID_INPUT", values, fieldErrors };
}

function revalidateCatalog(locale: SupportedLocale) {
  revalidatePath(localizedPath(locale, dashboardCatalogRouteSlug));
  revalidatePublicCatalog();
}

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

  if (!isValidSlug(bgSlug)) fieldErrors.bgSlug = bgSlug ? "INVALID" : "REQUIRED";
  if (!isValidSlug(enSlug)) fieldErrors.enSlug = enSlug ? "INVALID" : "REQUIRED";

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

  if (!isValidSlug(bgSlug)) fieldErrors.bgSlug = bgSlug ? "INVALID" : "REQUIRED";
  if (!isValidSlug(enSlug)) fieldErrors.enSlug = enSlug ? "INVALID" : "REQUIRED";

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

function parseSpecificationTranslations(value: unknown) {
  if (!Array.isArray(value)) return null;

  const translations: Array<{ locale: (typeof catalogLocales)[number]; label: string }> = [];

  for (const candidate of value) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !hasOnlyKeys(candidate, ["locale", "label"]) ||
      !("locale" in candidate) ||
      !("label" in candidate) ||
      !isCatalogLocale(candidate.locale) ||
      typeof candidate.label !== "string"
    ) {
      return null;
    }

    translations.push({ locale: candidate.locale, label: candidate.label });
  }

  return translations;
}

function parseSpecifications(
  value: string,
): CatalogSpecificationEditorInput[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  const specifications: CatalogSpecificationEditorInput[] = [];

  for (const candidate of parsed) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !hasOnlyKeys(candidate, [
        "id",
        "valueType",
        "unit",
        "displayOrder",
        "translations",
        "options",
      ]) ||
      !("id" in candidate) ||
      "key" in candidate ||
      "isRequired" in candidate ||
      "isFilterable" in candidate ||
      (candidate.id !== null &&
        (typeof candidate.id !== "string" || !isUuid(candidate.id))) ||
      !("valueType" in candidate) ||
      !["text", "number", "boolean", "selection"].includes(
        String(candidate.valueType),
      ) ||
      !("unit" in candidate) ||
      (candidate.unit !== null && typeof candidate.unit !== "string") ||
      !("displayOrder" in candidate) ||
      typeof candidate.displayOrder !== "number" ||
      !Number.isSafeInteger(candidate.displayOrder) ||
      candidate.displayOrder < 0 ||
      !("translations" in candidate) ||
      !("options" in candidate)
    ) {
      return null;
    }

    const translations = parseSpecificationTranslations(candidate.translations);
    if (!translations || !Array.isArray(candidate.options)) return null;
    const options: CatalogSpecificationEditorInput["options"] = [];

    for (const option of candidate.options) {
      if (
        typeof option !== "object" ||
        option === null ||
        !hasOnlyKeys(option, ["id", "displayOrder", "translations"]) ||
        !("id" in option) ||
        "code" in option ||
        (option.id !== null &&
          (typeof option.id !== "string" || !isUuid(option.id))) ||
        !("displayOrder" in option) ||
        typeof option.displayOrder !== "number" ||
        !Number.isSafeInteger(option.displayOrder) ||
        option.displayOrder < 0 ||
        !("translations" in option)
      ) {
        return null;
      }

      const optionTranslations = parseSpecificationTranslations(
        option.translations,
      );
      if (!optionTranslations) return null;
      options.push({
        id: option.id,
        displayOrder: option.displayOrder,
        translations: optionTranslations,
      });
    }

    specifications.push({
      id: candidate.id,
      valueType:
        candidate.valueType as CatalogSpecificationEditorInput["valueType"],
      unit: candidate.unit,
      displayOrder: candidate.displayOrder,
      translations,
      options,
    });
  }

  return specifications;
}

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

function parseReorderCategories(value: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  const categories: Array<{
    id: string;
    sortOrder: number;
    expectedUpdatedAt: string;
  }> = [];

  for (const candidate of parsed) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      typeof candidate.id !== "string" ||
      !isUuid(candidate.id) ||
      !("sortOrder" in candidate) ||
      typeof candidate.sortOrder !== "number" ||
      !Number.isSafeInteger(candidate.sortOrder) ||
      candidate.sortOrder < 0 ||
      !("expectedUpdatedAt" in candidate) ||
      typeof candidate.expectedUpdatedAt !== "string" ||
      !isValidTimestamp(candidate.expectedUpdatedAt)
    ) {
      return null;
    }

    categories.push({
      id: candidate.id,
      sortOrder: candidate.sortOrder,
      expectedUpdatedAt: candidate.expectedUpdatedAt,
    });
  }

  return categories;
}

export async function manageCatalogCategoryAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const categoryId = stringValue(formData, "categoryId");
  const expectedUpdatedAt = stringValue(formData, "expectedUpdatedAt");
  const intent = stringValue(formData, "intent");

  if (
    !locale ||
    !isUuid(categoryId) ||
    !isValidTimestamp(expectedUpdatedAt)
  ) {
    return { status: "error", code: "INVALID_INPUT", values };
  }

  try {
    const actor = await requireCatalogManager();
    let successCode: CatalogActionCode;

    if (intent === "move") {
      const parentId = stringValue(formData, "parentId") || null;

      if (parentId !== null && !isUuid(parentId)) {
        return { status: "error", code: "INVALID_INPUT", values };
      }

      await moveCatalogCategory({
        actorId: actor.id,
        categoryId,
        parentId,
        expectedUpdatedAt,
      });
      successCode = "MOVED";
    } else if (intent === "reorder") {
      const categories = parseReorderCategories(
        stringValue(formData, "categories"),
      );
      if (!categories) {
        return { status: "error", code: "INVALID_INPUT", values };
      }
      await reorderCatalogCategories({ actorId: actor.id, categories });
      successCode = "REORDERED";
    } else if (intent === "publish") {
      await publishCatalogCategory({ actorId: actor.id, categoryId, expectedUpdatedAt });
      successCode = "PUBLISHED";
    } else if (intent === "unpublish") {
      await unpublishCatalogCategory({ actorId: actor.id, categoryId, expectedUpdatedAt });
      successCode = "UNPUBLISHED";
    } else if (intent === "archive") {
      await archiveCatalogCategory({ actorId: actor.id, categoryId, expectedUpdatedAt });
      successCode = "ARCHIVED";
    } else if (intent === "restore") {
      await restoreCatalogCategory({ actorId: actor.id, categoryId, expectedUpdatedAt });
      successCode = "RESTORED";
    } else {
      return { status: "error", code: "INVALID_INPUT", values };
    }

    revalidateCatalog(locale);
    return {
      status: "success",
      code: successCode,
      targetId: categoryId,
    };
  } catch (error) {
    return errorResult(error, values);
  }
}
