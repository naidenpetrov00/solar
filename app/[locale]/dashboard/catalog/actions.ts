"use server";

import { revalidatePath } from "next/cache";

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
} from "@/lib/catalog/management";
import {
  catalogLocales,
  CatalogValidationError,
  isCatalogLocale,
  isUuid,
  type CatalogSpecificationInput,
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
    return {
      status: "error",
      code: error.code,
      values,
      fieldErrors,
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
}

export async function createCatalogCategoryAction(
  _previous: CatalogActionResult,
  formData: FormData,
): Promise<CatalogActionResult> {
  const values = stringValues(formData);
  const locale = actionLocale(formData);
  const slug = stringValue(formData, "slug");
  const name = stringValue(formData, "name");
  const introduction = stringValue(formData, "introduction");
  const parentId = stringValue(formData, "parentId") || null;

  if (
    !locale ||
    !slug ||
    !name.trim() ||
    !introduction.trim() ||
    (parentId !== null && !isUuid(parentId))
  ) {
    return { status: "error", code: "INVALID_INPUT", values };
  }

  try {
    const actor = await requireCatalogManager();
    const created = await createCatalogCategory({
      actorId: actor.id,
      parentId,
      slug,
      translations: [
        {
          locale: "bg",
          name,
          introduction,
        },
      ],
    });
    revalidateCatalog(locale);
    return { status: "success", code: "CREATED", targetId: created.id };
  } catch (error) {
    return errorResult(error, values);
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
  const slug = stringValue(formData, "slug");
  const sortOrder = Number(stringValue(formData, "sortOrder"));

  if (
    !locale ||
    !isUuid(categoryId) ||
    !isValidTimestamp(expectedUpdatedAt) ||
    !slug ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0
  ) {
    return { status: "error", code: "INVALID_INPUT", values };
  }

  try {
    const actor = await requireCatalogManager();
    await updateCatalogCategory({
      actorId: actor.id,
      categoryId,
      expectedUpdatedAt,
      slug,
      sortOrder,
    });
    revalidateCatalog(locale);
    return { status: "success", code: "SAVED", targetId: categoryId };
  } catch (error) {
    return errorResult(error, values);
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
  const translations = catalogLocales.flatMap((contentLocale) => {
    const prefix = `content.${contentLocale}`;
    const name = stringValue(formData, `${prefix}.name`);
    const introduction = stringValue(formData, `${prefix}.introduction`);
    const detailedContent = stringValue(formData, `${prefix}.detailedContent`);
    const seoTitle = stringValue(formData, `${prefix}.seoTitle`);
    const metaDescription = stringValue(formData, `${prefix}.metaDescription`);
    const productTitleGuidance = stringValue(
      formData,
      `${prefix}.productTitleGuidance`,
    );
    const hasContent = [
      name,
      introduction,
      detailedContent,
      seoTitle,
      metaDescription,
      productTitleGuidance,
    ].some((value) => value.trim().length > 0);

    if (!hasContent) return [];

    if (!name.trim()) fieldErrors[`${prefix}.name`] = "REQUIRED";
    if (!introduction.trim()) {
      fieldErrors[`${prefix}.introduction`] = "REQUIRED";
    }

    return [
      {
        locale: contentLocale,
        name,
        introduction,
        detailedContent,
        seoTitle,
        metaDescription,
        productTitleGuidance,
      },
    ];
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
    await replaceCatalogCategoryTranslations({
      actorId: actor.id,
      categoryId,
      expectedUpdatedAt,
      translations,
    });
    revalidateCatalog(locale);
    return { status: "success", code: "SAVED", targetId: categoryId };
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

function parseSpecifications(value: string): CatalogSpecificationInput[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  const specifications: CatalogSpecificationInput[] = [];

  for (const candidate of parsed) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("key" in candidate) ||
      typeof candidate.key !== "string" ||
      !("valueType" in candidate) ||
      !["text", "number", "boolean", "selection"].includes(
        String(candidate.valueType),
      ) ||
      !("unit" in candidate) ||
      (candidate.unit !== null && typeof candidate.unit !== "string") ||
      !("isRequired" in candidate) ||
      typeof candidate.isRequired !== "boolean" ||
      !("isFilterable" in candidate) ||
      typeof candidate.isFilterable !== "boolean" ||
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
    const options: CatalogSpecificationInput["options"] = [];

    for (const option of candidate.options) {
      if (
        typeof option !== "object" ||
        option === null ||
        !("code" in option) ||
        typeof option.code !== "string" ||
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
        code: option.code,
        displayOrder: option.displayOrder,
        translations: optionTranslations,
      });
    }

    specifications.push({
      key: candidate.key,
      valueType: candidate.valueType as CatalogSpecificationInput["valueType"],
      unit: candidate.unit,
      isRequired: candidate.isRequired,
      isFilterable: candidate.isFilterable,
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

  if (
    !locale ||
    !isUuid(categoryId) ||
    !isValidTimestamp(expectedUpdatedAt) ||
    !specifications
  ) {
    return { status: "error", code: "INVALID_INPUT", values };
  }

  try {
    const actor = await requireCatalogManager();
    await replaceCatalogCategorySpecifications({
      actorId: actor.id,
      categoryId,
      expectedUpdatedAt,
      specifications,
    });
    revalidateCatalog(locale);
    return { status: "success", code: "SAVED", targetId: categoryId };
  } catch (error) {
    return errorResult(error, values);
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
