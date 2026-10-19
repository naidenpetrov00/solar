import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";

import { db } from "@/db";
import {
  catalogCategory,
  catalogCategoryTranslation,
  catalogProduct,
  catalogProductAdditionalCategory,
  catalogProductMedia,
  catalogProductMediaTranslation,
  catalogProductSpecificationValue,
  catalogProductTranslation,
  catalogSpecification,
  catalogSpecificationOption,
  catalogSpecificationOptionTranslation,
  catalogSpecificationTranslation,
} from "@/db/schema";
import {
  CATALOG_INTERNAL_NAME_MAX_LENGTH,
  assertUniqueLocales,
  catalogLocales,
  hasAllCatalogLocales,
  isCatalogLocale,
  isUuid,
  normalizeBrand,
  normalizeGtin,
  normalizeLongText,
  normalizeMediaReference,
  normalizeMpn,
  normalizeOptionalText,
  normalizeRequiredText,
  validateCommerceInput,
  validateDecimal,
  validateNonNegativeInteger,
  validateSlug,
  validateStableKey,
  type CatalogAvailability,
  type CatalogCategoryTranslationInput,
  type CatalogLocale,
  type CatalogPriceInput,
  type CatalogProductMediaInput,
  type CatalogProductSpecificationValueInput,
  type CatalogProductTranslationInput,
  type CatalogSalesMode,
  type CatalogSpecificationInput,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import {
  getCatalogActorRole,
  getCategoryPublicationAggregate,
  getProductPublicationAggregate,
  lockCatalogCategory,
  lockCatalogProduct,
  type CatalogTransaction,
} from "@/lib/catalog/repository";
import { hasPermission, type AppPermission } from "@/lib/authorization";

export type CatalogManagementErrorCode =
  | "ACTIVE_DEPENDENCY_EXISTS"
  | "ARCHIVED_ANCESTOR"
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

export class CatalogManagementError extends Error {
  constructor(
    readonly code: CatalogManagementErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = "CatalogManagementError";
  }
}

export type CatalogCategoryPublicationIssue =
  | { code: "PARENT_NOT_PUBLISHED" }
  | { code: "MISSING_CATEGORY_TRANSLATION"; locale: CatalogLocale }
  | {
      code: "MISSING_SPECIFICATION_TRANSLATION";
      locale: CatalogLocale;
      specificationKey: string;
    }
  | { code: "SELECTION_OPTIONS_REQUIRED"; specificationKey: string }
  | {
      code: "MISSING_OPTION_TRANSLATION";
      locale: CatalogLocale;
      specificationKey: string;
      optionCode: string;
    };

export type ManagedCatalogCategoryTreeItem = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  updatedAt: string;
};

export type ManagedCatalogCategoryDetail = {
  id: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
  translations: Array<{
    locale: CatalogLocale;
    name: string;
    introduction: string;
    detailedContent: string | null;
    seoTitle: string | null;
    metaDescription: string | null;
    productTitleGuidance: string | null;
  }>;
  specifications: Array<{
    id: string;
    key: string;
    valueType: "text" | "number" | "boolean" | "selection";
    unit: string | null;
    isRequired: boolean;
    isFilterable: boolean;
    displayOrder: number;
    translations: Array<{ locale: CatalogLocale; label: string }>;
    options: Array<{
      id: string;
      code: string;
      displayOrder: number;
      translations: Array<{ locale: CatalogLocale; label: string }>;
    }>;
  }>;
  publicationIssues: CatalogCategoryPublicationIssue[];
};

export type ManagedCatalogCategoryWorkspace = {
  canManage: boolean;
  categories: ManagedCatalogCategoryTreeItem[];
  selected: ManagedCatalogCategoryDetail | null;
};

export type CreateCatalogCategoryInput = {
  actorId: string;
  parentId?: string | null;
  slug: string;
  sortOrder?: number;
  translations?: CatalogCategoryTranslationInput[];
  specifications?: CatalogSpecificationInput[];
};

export type UpdateCatalogCategoryInput = {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  slug: string;
  sortOrder: number;
};

export type CreateCatalogProductInput = {
  actorId: string;
  internalName: string;
  brand?: string | null;
  slug: string;
  salesMode: CatalogSalesMode;
  primaryCategoryId: string;
  additionalCategoryIds?: string[];
  availability: CatalogAvailability | null;
  gtin?: string | null;
  mpn?: string | null;
  price: CatalogPriceInput;
  translations?: CatalogProductTranslationInput[];
  specificationValues?: CatalogProductSpecificationValueInput[];
  media?: CatalogProductMediaInput[];
};

export type UpdateCatalogProductInput = {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  internalName: string;
  brand?: string | null;
  slug: string;
  salesMode: CatalogSalesMode;
  primaryCategoryId: string;
  availability: CatalogAvailability | null;
  gtin?: string | null;
  mpn?: string | null;
  price: CatalogPriceInput;
};

function assertIdentifier(value: string) {
  if (!isUuid(value)) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}

function assertFresh(actual: Date, expected: string) {
  if (!Number.isFinite(Date.parse(expected)) || actual.toISOString() !== expected) {
    throw new CatalogManagementError("STALE");
  }
}

async function assertCatalogActor(
  transaction: CatalogTransaction,
  actorId: string,
  permission: AppPermission,
) {
  const role = await getCatalogActorRole(transaction, actorId, true);

  if (!hasPermission(role, permission)) {
    throw new CatalogManagementError("FORBIDDEN");
  }
}

function catalogCategoryStatus(value: string) {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  throw new CatalogManagementError("INVALID_INPUT");
}

function catalogSpecificationValueType(
  value: string,
): CatalogSpecificationValueType {
  if (
    value === "text" ||
    value === "number" ||
    value === "boolean" ||
    value === "selection"
  ) {
    return value;
  }

  throw new CatalogManagementError("INVALID_INPUT");
}

function categoryParentPredicate(parentId: string | null) {
  return parentId === null
    ? isNull(catalogCategory.parentId)
    : eq(catalogCategory.parentId, parentId);
}

async function nextCategorySortOrder(
  transaction: CatalogTransaction,
  parentId: string | null,
  excludedCategoryId?: string,
) {
  const parentPredicate = categoryParentPredicate(parentId);
  const predicate = excludedCategoryId
    ? and(parentPredicate, ne(catalogCategory.id, excludedCategoryId))
    : parentPredicate;
  const [lastSibling] = await transaction
    .select({ sortOrder: catalogCategory.sortOrder })
    .from(catalogCategory)
    .where(predicate)
    .orderBy(desc(catalogCategory.sortOrder), desc(catalogCategory.id))
    .limit(1)
    .for("update");

  return (lastSibling?.sortOrder ?? -1) + 1;
}

async function assertCategorySlugAvailable(
  transaction: CatalogTransaction,
  parentId: string | null,
  slug: string,
  excludedCategoryId?: string,
) {
  const predicates = [categoryParentPredicate(parentId), eq(catalogCategory.slug, slug)];

  if (excludedCategoryId) {
    predicates.push(ne(catalogCategory.id, excludedCategoryId));
  }

  const [conflict] = await transaction
    .select({ id: catalogCategory.id })
    .from(catalogCategory)
    .where(and(...predicates))
    .limit(1)
    .for("update");

  if (conflict) {
    throw new CatalogManagementError("SLUG_CONFLICT");
  }
}

function isCategorySlugConstraintError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const code = "code" in error ? error.code : undefined;
  const constraint = "constraint" in error ? error.constraint : undefined;

  return (
    code === "23505" &&
    (constraint === "catalog_category_root_slug_idx" ||
      constraint === "catalog_category_sibling_slug_idx")
  );
}

function normalizeCategoryTranslations(
  translations: CatalogCategoryTranslationInput[],
) {
  assertUniqueLocales(translations);
  return translations.map((translation) => ({
    locale: translation.locale,
    name: normalizeRequiredText(translation.name, 200),
    introduction: normalizeRequiredText(translation.introduction, 2000),
    detailedContent: normalizeLongText(translation.detailedContent, 50_000),
    seoTitle: normalizeOptionalText(translation.seoTitle, 200),
    metaDescription: normalizeOptionalText(translation.metaDescription, 500),
    productTitleGuidance: normalizeOptionalText(
      translation.productTitleGuidance,
      1000,
    ),
  }));
}

function normalizeProductTranslations(
  translations: CatalogProductTranslationInput[],
) {
  assertUniqueLocales(translations);
  return translations.map((translation) => ({
    locale: translation.locale,
    title: normalizeRequiredText(translation.title, 200),
    shortDescription: normalizeRequiredText(translation.shortDescription, 2000),
    fullDescription:
      normalizeLongText(translation.fullDescription, 50_000, true) ?? "",
    marketingLabel: normalizeOptionalText(translation.marketingLabel, 120),
    seoTitle: normalizeOptionalText(translation.seoTitle, 200),
    metaDescription: normalizeOptionalText(translation.metaDescription, 500),
  }));
}

function normalizeSpecifications(specifications: CatalogSpecificationInput[]) {
  const keys = new Set<string>();

  return specifications.map((specification) => {
    const key = validateStableKey(specification.key);

    if (keys.has(key)) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    keys.add(key);
    assertUniqueLocales(specification.translations);

    if (
      specification.valueType !== "selection" &&
      specification.options.length !== 0
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    const optionCodes = new Set<string>();
    const options = specification.options.map((option) => {
      const code = validateStableKey(option.code);

      if (optionCodes.has(code)) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      optionCodes.add(code);
      assertUniqueLocales(option.translations);
      return {
        code,
        displayOrder: validateNonNegativeInteger(option.displayOrder),
        translations: option.translations.map((translation) => ({
          locale: translation.locale,
          label: normalizeRequiredText(translation.label, 200),
        })),
      };
    });

    return {
      key,
      valueType: specification.valueType,
      unit: normalizeOptionalText(specification.unit, 40),
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: validateNonNegativeInteger(specification.displayOrder),
      translations: specification.translations.map((translation) => ({
        locale: translation.locale,
        label: normalizeRequiredText(translation.label, 200),
      })),
      options,
    };
  });
}

function normalizeMedia(media: CatalogProductMediaInput[]) {
  const references = new Set<string>();
  const orders = new Set<number>();
  let primaryCount = 0;
  let socialCount = 0;

  return media.map((item) => {
    const reference = normalizeMediaReference(item.reference);
    const displayOrder = validateNonNegativeInteger(item.displayOrder);
    assertUniqueLocales(item.translations);

    if (references.has(reference) || orders.has(displayOrder)) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    references.add(reference);
    orders.add(displayOrder);
    primaryCount += item.isPrimary ? 1 : 0;
    socialCount += item.isSocialImage ? 1 : 0;

    if (primaryCount > 1 || socialCount > 1) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    return {
      reference,
      displayOrder,
      isPrimary: item.isPrimary,
      isSocialImage: item.isSocialImage,
      translations: item.translations.map((translation) => ({
        locale: translation.locale,
        altText: normalizeRequiredText(translation.altText, 500),
      })),
    };
  });
}

async function insertCategoryTranslations(
  transaction: CatalogTransaction,
  categoryId: string,
  translations: ReturnType<typeof normalizeCategoryTranslations>,
) {
  if (translations.length === 0) return;
  await transaction.insert(catalogCategoryTranslation).values(
    translations.map((translation) => ({ categoryId, ...translation })),
  );
}

async function insertCategorySpecifications(
  transaction: CatalogTransaction,
  categoryId: string,
  specifications: ReturnType<typeof normalizeSpecifications>,
) {
  for (const specification of specifications) {
    const specificationId = randomUUID();
    await transaction.insert(catalogSpecification).values({
      id: specificationId,
      categoryId,
      key: specification.key,
      valueType: specification.valueType,
      unit: specification.unit,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specification.displayOrder,
    });

    if (specification.translations.length > 0) {
      await transaction.insert(catalogSpecificationTranslation).values(
        specification.translations.map((translation) => ({
          specificationId,
          ...translation,
        })),
      );
    }

    for (const option of specification.options) {
      const optionId = randomUUID();
      await transaction.insert(catalogSpecificationOption).values({
        id: optionId,
        specificationId,
        code: option.code,
        displayOrder: option.displayOrder,
      });

      if (option.translations.length > 0) {
        await transaction.insert(catalogSpecificationOptionTranslation).values(
          option.translations.map((translation) => ({
            optionId,
            ...translation,
          })),
        );
      }
    }
  }
}

async function assertCategoryExists(
  transaction: CatalogTransaction,
  categoryId: string,
  lock = false,
) {
  const query = transaction
    .select({ id: catalogCategory.id, status: catalogCategory.status })
    .from(catalogCategory)
    .where(eq(catalogCategory.id, categoryId))
    .limit(1);
  const [category] = lock ? await query.for("update") : await query;

  if (!category || category.status === "archived") {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  return category;
}

export async function getManagedCatalogCategoryWorkspace(
  actorId: string,
  requestedLocale: string,
  requestedCategoryId?: string,
): Promise<ManagedCatalogCategoryWorkspace> {
  const role = await getCatalogActorRole(db, actorId);

  if (!hasPermission(role, "catalog:view")) {
    throw new CatalogManagementError("FORBIDDEN");
  }

  const locale = isCatalogLocale(requestedLocale) ? requestedLocale : "bg";
  const [categoryRows, translationRows] = await Promise.all([
    db
      .select()
      .from(catalogCategory)
      .orderBy(
        asc(catalogCategory.parentId),
        asc(catalogCategory.sortOrder),
        asc(catalogCategory.id),
      ),
    db
      .select()
      .from(catalogCategoryTranslation)
      .orderBy(
        asc(catalogCategoryTranslation.categoryId),
        asc(catalogCategoryTranslation.locale),
      ),
  ]);
  const translationsByCategory = new Map<
    string,
    typeof translationRows
  >();

  for (const translation of translationRows) {
    const translations = translationsByCategory.get(translation.categoryId) ?? [];
    translations.push(translation);
    translationsByCategory.set(translation.categoryId, translations);
  }

  const categories = categoryRows.map((category) => {
    const translations = translationsByCategory.get(category.id) ?? [];
    const displayTranslation =
      translations.find((translation) => translation.locale === locale) ??
      translations.find((translation) => translation.locale === "bg") ??
      translations[0];

    return {
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      name: displayTranslation?.name ?? category.slug,
      sortOrder: category.sortOrder,
      status: catalogCategoryStatus(category.status),
      updatedAt: category.updatedAt.toISOString(),
    } satisfies ManagedCatalogCategoryTreeItem;
  });
  const selectedId =
    (requestedCategoryId &&
      categories.some(({ id }) => id === requestedCategoryId) &&
      requestedCategoryId) ||
    null;

  if (!selectedId) {
    return {
      canManage: hasPermission(role, "catalog:manage"),
      categories,
      selected: null,
    };
  }

  const aggregate = await getCategoryPublicationAggregate(db, selectedId);

  if (!aggregate) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const specifications = aggregate.specifications
    .toSorted(
      (left, right) =>
        left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
    )
    .map((specification) => ({
      id: specification.id,
      key: specification.key,
      valueType: catalogSpecificationValueType(specification.valueType),
      unit: specification.unit,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specification.displayOrder,
      translations: aggregate.specificationTranslations.flatMap((translation) =>
        translation.specificationId === specification.id &&
        isCatalogLocale(translation.locale)
          ? [{ locale: translation.locale, label: translation.label }]
          : [],
      ),
      options: aggregate.options
        .filter(({ specificationId }) => specificationId === specification.id)
        .toSorted(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.id.localeCompare(right.id),
        )
        .map((option) => ({
          id: option.id,
          code: option.code,
          displayOrder: option.displayOrder,
          translations: aggregate.optionTranslations.flatMap((translation) =>
            translation.optionId === option.id &&
            isCatalogLocale(translation.locale)
              ? [{ locale: translation.locale, label: translation.label }]
              : [],
          ),
        })),
    }));
  const selected: ManagedCatalogCategoryDetail = {
    id: aggregate.category.id,
    parentId: aggregate.category.parentId,
    slug: aggregate.category.slug,
    sortOrder: aggregate.category.sortOrder,
    status: catalogCategoryStatus(aggregate.category.status),
    publishedAt: aggregate.category.publishedAt?.toISOString() ?? null,
    archivedAt: aggregate.category.archivedAt?.toISOString() ?? null,
    updatedAt: aggregate.category.updatedAt.toISOString(),
    translations: aggregate.translations.flatMap((translation) =>
      isCatalogLocale(translation.locale)
        ? [
            {
              locale: translation.locale,
              name: translation.name,
              introduction: translation.introduction,
              detailedContent: translation.detailedContent,
              seoTitle: translation.seoTitle,
              metaDescription: translation.metaDescription,
              productTitleGuidance: translation.productTitleGuidance,
            },
          ]
        : [],
    ),
    specifications,
    publicationIssues: getCatalogCategoryPublicationIssues(aggregate),
  };

  return {
    canManage: hasPermission(role, "catalog:manage"),
    categories,
    selected,
  };
}

export async function createCatalogCategory(input: CreateCatalogCategoryInput) {
  if (input.parentId) assertIdentifier(input.parentId);
  const slug = validateSlug(input.slug);
  const translations = normalizeCategoryTranslations(input.translations ?? []);
  const specifications = normalizeSpecifications(input.specifications ?? []);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    if (input.parentId) {
      await assertCategoryExists(transaction, input.parentId, true);
    }

    await assertCategorySlugAvailable(
      transaction,
      input.parentId ?? null,
      slug,
    );
    const sortOrder =
      input.sortOrder === undefined
        ? await nextCategorySortOrder(transaction, input.parentId ?? null)
        : validateNonNegativeInteger(input.sortOrder);

    let created: {
      id: string;
      slug: string;
      status: string;
      updatedAt: Date;
    };

    try {
      [created] = await transaction
        .insert(catalogCategory)
        .values({
          parentId: input.parentId ?? null,
          slug,
          sortOrder,
        })
        .returning({
          id: catalogCategory.id,
          slug: catalogCategory.slug,
          status: catalogCategory.status,
          updatedAt: catalogCategory.updatedAt,
        });
    } catch (error) {
      if (isCategorySlugConstraintError(error)) {
        throw new CatalogManagementError("SLUG_CONFLICT");
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
  const slug = validateSlug(input.slug);
  const sortOrder = validateNonNegativeInteger(input.sortOrder);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);

    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    if (category.publishedAt && slug !== category.slug) {
      throw new CatalogManagementError("SLUG_IMMUTABLE");
    }

    await assertCategorySlugAvailable(
      transaction,
      category.parentId,
      slug,
      category.id,
    );

    const updatedAt = new Date();
    let updated: {
      id: string;
      slug: string;
      status: string;
      updatedAt: Date;
    };

    try {
      [updated] = await transaction
        .update(catalogCategory)
        .set({ slug, sortOrder, updatedAt })
        .where(eq(catalogCategory.id, category.id))
        .returning({
          id: catalogCategory.id,
          slug: catalogCategory.slug,
          status: catalogCategory.status,
          updatedAt: catalogCategory.updatedAt,
        });
    } catch (error) {
      if (isCategorySlugConstraintError(error)) {
        throw new CatalogManagementError("SLUG_CONFLICT");
      }

      throw error;
    }
    return { ...updated, updatedAt: updated.updatedAt.toISOString() };
  });
}

async function lockAndValidateCategoryPath(
  transaction: CatalogTransaction,
  categoryId: string,
  parentId: string | null,
) {
  if (parentId === null) return [];
  if (categoryId === parentId) throw new CatalogManagementError("CYCLE");

  const lockedIds = new Set<string>();

  for (;;) {
    const rows = await transaction
      .select({
        id: catalogCategory.id,
        parentId: catalogCategory.parentId,
        status: catalogCategory.status,
      })
      .from(catalogCategory);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const path: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = parentId;

    while (cursor !== null) {
      if (cursor === categoryId || seen.has(cursor)) {
        throw new CatalogManagementError("CYCLE");
      }

      const row = rowById.get(cursor);
      if (!row) {
        throw new CatalogManagementError("NOT_FOUND");
      }

      seen.add(cursor);
      path.push(cursor);
      cursor = row.parentId;
    }

    const unlocked = path.filter((id) => !lockedIds.has(id)).sort();

    if (unlocked.length === 0) {
      return path.map((id) => {
        const row = rowById.get(id);
        if (!row) throw new CatalogManagementError("NOT_FOUND");
        return row;
      });
    }

    await transaction
      .select({ id: catalogCategory.id })
      .from(catalogCategory)
      .where(inArray(catalogCategory.id, unlocked))
      .orderBy(asc(catalogCategory.id))
      .for("update");
    unlocked.forEach((id) => lockedIds.add(id));
  }
}

async function lockCategoryMoveRows(
  transaction: CatalogTransaction,
  categoryId: string,
  parentId: string | null,
) {
  if (categoryId === parentId) throw new CatalogManagementError("CYCLE");

  const rows = await transaction
    .select({
      id: catalogCategory.id,
      parentId: catalogCategory.parentId,
    })
    .from(catalogCategory);
  const parentById = new Map(rows.map((row) => [row.id, row.parentId]));

  if (!parentById.has(categoryId)) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const path: string[] = [];
  const seen = new Set<string>();
  let cursor = parentId;

  while (cursor !== null) {
    if (cursor === categoryId || seen.has(cursor)) {
      throw new CatalogManagementError("CYCLE");
    }

    if (!parentById.has(cursor)) {
      throw new CatalogManagementError("NOT_FOUND");
    }

    seen.add(cursor);
    path.push(cursor);
    cursor = parentById.get(cursor) ?? null;
  }

  const lockIds = [...new Set([categoryId, ...path])].sort();
  const lockedRows = await transaction
    .select()
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, lockIds))
    .orderBy(asc(catalogCategory.id))
    .for("update");
  const lockedById = new Map(lockedRows.map((row) => [row.id, row]));
  const category = lockedById.get(categoryId);

  if (!category || lockedRows.length !== lockIds.length) {
    throw new CatalogManagementError("NOT_FOUND");
  }

  const lockedPath: string[] = [];
  const lockedSeen = new Set<string>();
  cursor = parentId;

  while (cursor !== null) {
    if (cursor === categoryId || lockedSeen.has(cursor)) {
      throw new CatalogManagementError("CYCLE");
    }

    const row = lockedById.get(cursor);
    if (!row) throw new CatalogManagementError("STALE");
    lockedSeen.add(cursor);
    lockedPath.push(cursor);
    cursor = row.parentId;
  }

  if (
    lockedPath.length !== path.length ||
    lockedPath.some((id, index) => id !== path[index])
  ) {
    throw new CatalogManagementError("STALE");
  }

  return category;
}

export async function moveCatalogCategory(input: {
  actorId: string;
  categoryId: string;
  parentId: string | null;
  expectedUpdatedAt: string;
}) {
  assertIdentifier(input.categoryId);
  if (input.parentId) assertIdentifier(input.parentId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCategoryMoveRows(
      transaction,
      input.categoryId,
      input.parentId,
    );

    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    if (input.parentId) {
      const parent = await assertCategoryExists(transaction, input.parentId);

      if (category.status === "published" && parent.status !== "published") {
        throw new CatalogManagementError("PUBLICATION_INVALID");
      }
    }

    await assertCategorySlugAvailable(
      transaction,
      input.parentId,
      category.slug,
      category.id,
    );
    const sortOrder = await nextCategorySortOrder(
      transaction,
      input.parentId,
      category.id,
    );

    const updatedAt = new Date();
    try {
      await transaction
        .update(catalogCategory)
        .set({ parentId: input.parentId, sortOrder, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    } catch (error) {
      if (isCategorySlugConstraintError(error)) {
        throw new CatalogManagementError("SLUG_CONFLICT");
      }

      throw error;
    }
    return { id: category.id, updatedAt: updatedAt.toISOString() };
  });
}

export async function reorderCatalogCategories(input: {
  actorId: string;
  categories: Array<{
    id: string;
    sortOrder: number;
    expectedUpdatedAt: string;
  }>;
}) {
  const ids = input.categories.map(({ id }) => id);

  if (new Set(ids).size !== ids.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  ids.forEach(assertIdentifier);
  input.categories.forEach(({ sortOrder }) => validateNonNegativeInteger(sortOrder));

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");

    if (ids.length === 0) return [];

    const rows = await transaction
      .select()
      .from(catalogCategory)
      .where(inArray(catalogCategory.id, [...ids].sort()))
      .orderBy(asc(catalogCategory.id))
      .for("update");

    if (rows.length !== ids.length) throw new CatalogManagementError("NOT_FOUND");
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const updatedAt = new Date();

    for (const item of input.categories) {
      const row = rowById.get(item.id);
      if (!row) throw new CatalogManagementError("NOT_FOUND");
      assertFresh(row.updatedAt, item.expectedUpdatedAt);
      await transaction
        .update(catalogCategory)
        .set({ sortOrder: item.sortOrder, updatedAt })
        .where(eq(catalogCategory.id, item.id));
    }

    return input.categories.map(({ id }) => ({
      id,
      updatedAt: updatedAt.toISOString(),
    }));
  });
}

export async function replaceCatalogCategoryTranslations(input: {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  translations: CatalogCategoryTranslationInput[];
}) {
  assertIdentifier(input.categoryId);
  const translations = normalizeCategoryTranslations(input.translations);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    if (category.status === "published" && !hasAllCatalogLocales(translations)) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }

    await transaction
      .delete(catalogCategoryTranslation)
      .where(eq(catalogCategoryTranslation.categoryId, category.id));
    await insertCategoryTranslations(transaction, category.id, translations);
    const updatedAt = new Date();
    await transaction
      .update(catalogCategory)
      .set({ updatedAt })
      .where(eq(catalogCategory.id, category.id));
    return { id: category.id, updatedAt: updatedAt.toISOString() };
  });
}

export async function replaceCatalogCategorySpecifications(input: {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  specifications: CatalogSpecificationInput[];
}) {
  assertIdentifier(input.categoryId);
  const specifications = normalizeSpecifications(input.specifications);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);

    const existingSpecifications = await transaction
      .select({ id: catalogSpecification.id })
      .from(catalogSpecification)
      .where(eq(catalogSpecification.categoryId, category.id));
    const existingIds = existingSpecifications.map(({ id }) => id);
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
      const options = await transaction
        .select({ id: catalogSpecificationOption.id })
        .from(catalogSpecificationOption)
        .where(
          inArray(catalogSpecificationOption.specificationId, existingIds),
        );
      const optionIds = options.map(({ id }) => id);

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
          inArray(
            catalogSpecificationTranslation.specificationId,
            existingIds,
          ),
        );
      await transaction
        .delete(catalogSpecification)
        .where(inArray(catalogSpecification.id, existingIds));
    }

    await insertCategorySpecifications(transaction, category.id, specifications);
    const updatedAt = new Date();
    await transaction
      .update(catalogCategory)
      .set({ updatedAt })
      .where(eq(catalogCategory.id, category.id));
    return { id: category.id, updatedAt: updatedAt.toISOString() };
  });
}

export function getCatalogCategoryPublicationIssues(
  aggregate: NonNullable<
    Awaited<ReturnType<typeof getCategoryPublicationAggregate>>
  >,
) {
  const issues: CatalogCategoryPublicationIssue[] = [];

  if (aggregate.parent && aggregate.parent.status !== "published") {
    issues.push({ code: "PARENT_NOT_PUBLISHED" });
  }

  for (const locale of catalogLocales) {
    if (!aggregate.translations.some((translation) => translation.locale === locale)) {
      issues.push({ code: "MISSING_CATEGORY_TRANSLATION", locale });
    }
  }

  for (const specification of aggregate.specifications) {
    const translations = aggregate.specificationTranslations.filter(
      ({ specificationId }) => specificationId === specification.id,
    );

    for (const locale of catalogLocales) {
      if (!translations.some((translation) => translation.locale === locale)) {
        issues.push({
          code: "MISSING_SPECIFICATION_TRANSLATION",
          locale,
          specificationKey: specification.key,
        });
      }
    }

    if (specification.valueType === "selection") {
      const options = aggregate.options.filter(
        ({ specificationId }) => specificationId === specification.id,
      );

      if (options.length === 0) {
        issues.push({
          code: "SELECTION_OPTIONS_REQUIRED",
          specificationKey: specification.key,
        });
      }

      for (const option of options) {
        const translations = aggregate.optionTranslations.filter(
          ({ optionId }) => optionId === option.id,
        );

        for (const locale of catalogLocales) {
          if (!translations.some((translation) => translation.locale === locale)) {
            issues.push({
              code: "MISSING_OPTION_TRANSLATION",
              locale,
              specificationKey: specification.key,
              optionCode: option.code,
            });
          }
        }
      }
    }
  }

  return issues;
}

function assertCategoryPublishable(
  aggregate: NonNullable<
    Awaited<ReturnType<typeof getCategoryPublicationAggregate>>
  >,
) {
  const issues = getCatalogCategoryPublicationIssues(aggregate);

  if (issues.length > 0) {
    throw new CatalogManagementError("PUBLICATION_INVALID", issues);
  }
}

async function transitionCatalogCategory(input: {
  actorId: string;
  categoryId: string;
  expectedUpdatedAt: string;
  intent: "publish" | "unpublish" | "archive" | "restore";
}) {
  assertIdentifier(input.categoryId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const category = await lockCatalogCategory(transaction, input.categoryId);
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.updatedAt, input.expectedUpdatedAt);
    const updatedAt = new Date();

    if (input.intent === "publish") {
      if (category.status !== "draft") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await lockAndValidateCategoryPath(
        transaction,
        category.id,
        category.parentId,
      );

      const aggregate = await getCategoryPublicationAggregate(
        transaction,
        category.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertCategoryPublishable(aggregate);
      await transaction
        .update(catalogCategory)
        .set({
          status: "published",
          publishedAt: category.publishedAt ?? updatedAt,
          archivedAt: null,
          updatedAt,
        })
        .where(eq(catalogCategory.id, category.id));
    } else if (input.intent === "unpublish") {
      if (category.status !== "published") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const [publishedChild] = await transaction
        .select({ id: catalogCategory.id })
        .from(catalogCategory)
        .where(
          and(
            eq(catalogCategory.parentId, category.id),
            eq(catalogCategory.status, "published"),
          ),
        )
        .limit(1);
      const [publishedProduct] = await transaction
        .select({ id: catalogProduct.id })
        .from(catalogProduct)
        .leftJoin(
          catalogProductAdditionalCategory,
          eq(catalogProductAdditionalCategory.productId, catalogProduct.id),
        )
        .where(
          and(
            eq(catalogProduct.status, "published"),
            or(
              eq(catalogProduct.primaryCategoryId, category.id),
              eq(catalogProductAdditionalCategory.categoryId, category.id),
            ),
          ),
        )
        .limit(1);

      if (publishedChild || publishedProduct) {
        throw new CatalogManagementError("PUBLISHED_DEPENDENCY_EXISTS");
      }

      await transaction
        .update(catalogCategory)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    } else if (input.intent === "restore") {
      if (category.status !== "archived") {
        throw new CatalogManagementError("ARCHIVED_ANCESTOR");
      }

      const ancestors = await lockAndValidateCategoryPath(
        transaction,
        category.id,
        category.parentId,
      );
      if (ancestors.some(({ status }) => status === "archived")) {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await transaction
        .update(catalogCategory)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    } else {
      if (category.status === "archived") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const rows = await transaction
        .select({
          id: catalogCategory.id,
          parentId: catalogCategory.parentId,
          status: catalogCategory.status,
        })
        .from(catalogCategory);
      const descendants = new Set<string>();
      let frontier = [category.id];

      while (frontier.length > 0) {
        const children = rows.filter(
          (row) =>
            row.parentId &&
            frontier.includes(row.parentId) &&
            !descendants.has(row.id),
        );
        frontier = children.map(({ id }) => id);
        children.forEach(({ id }) => descendants.add(id));
      }

      if (
        rows.some(
          (row) => descendants.has(row.id) && row.status !== "archived",
        )
      ) {
        throw new CatalogManagementError("ACTIVE_DEPENDENCY_EXISTS");
      }

      const affectedCategoryIds = [category.id, ...descendants];
      const [dependentProduct] = await transaction
        .select({ id: catalogProduct.id })
        .from(catalogProduct)
        .leftJoin(
          catalogProductAdditionalCategory,
          eq(catalogProductAdditionalCategory.productId, catalogProduct.id),
        )
        .where(
          and(
            ne(catalogProduct.status, "archived"),
            or(
              inArray(catalogProduct.primaryCategoryId, affectedCategoryIds),
              inArray(
                catalogProductAdditionalCategory.categoryId,
                affectedCategoryIds,
              ),
            ),
          ),
        )
        .limit(1);

      if (dependentProduct) {
        throw new CatalogManagementError("ACTIVE_DEPENDENCY_EXISTS");
      }

      await transaction
        .update(catalogCategory)
        .set({ status: "archived", archivedAt: updatedAt, updatedAt })
        .where(eq(catalogCategory.id, category.id));
    }

    return {
      id: category.id,
      status:
        input.intent === "publish"
          ? "published"
          : input.intent === "archive"
            ? "archived"
            : "draft",
      publishedAt: (category.publishedAt ??
        (input.intent === "publish" ? updatedAt : null))?.toISOString() ?? null,
      updatedAt: updatedAt.toISOString(),
    };
  });
}

export const publishCatalogCategory = (input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">) =>
  transitionCatalogCategory({ ...input, intent: "publish" });
export const unpublishCatalogCategory = (input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">) =>
  transitionCatalogCategory({ ...input, intent: "unpublish" });
export const archiveCatalogCategory = (input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">) =>
  transitionCatalogCategory({ ...input, intent: "archive" });
export const restoreCatalogCategory = (input: Omit<Parameters<typeof transitionCatalogCategory>[0], "intent">) =>
  transitionCatalogCategory({ ...input, intent: "restore" });

async function assertProductCategories(
  transaction: CatalogTransaction,
  primaryCategoryId: string,
  additionalCategoryIds: string[],
  requirePublished: boolean,
  lock = false,
  extraCategoryIdsToLock: string[] = [],
) {
  const uniqueAdditional = [...new Set(additionalCategoryIds)];

  if (
    uniqueAdditional.length !== additionalCategoryIds.length ||
    uniqueAdditional.includes(primaryCategoryId)
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }

  const assignedIds = [primaryCategoryId, ...uniqueAdditional];
  const ids = lock
    ? [...new Set([...assignedIds, ...extraCategoryIdsToLock])].sort()
    : assignedIds;
  ids.forEach(assertIdentifier);
  const query = transaction
    .select({ id: catalogCategory.id, status: catalogCategory.status })
    .from(catalogCategory)
    .where(inArray(catalogCategory.id, ids))
    .orderBy(asc(catalogCategory.id));
  const categories = lock ? await query.for("update") : await query;

  if (
    categories.length !== ids.length ||
    categories.some(({ status }) =>
      requirePublished ? status !== "published" : status === "archived",
    )
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
}

async function getProductAdditionalCategoryIds(
  transaction: CatalogTransaction,
  productId: string,
) {
  const rows = await transaction
    .select({ categoryId: catalogProductAdditionalCategory.categoryId })
    .from(catalogProductAdditionalCategory)
    .where(eq(catalogProductAdditionalCategory.productId, productId));
  return rows.map(({ categoryId }) => categoryId);
}

async function insertProductTranslations(
  transaction: CatalogTransaction,
  productId: string,
  translations: ReturnType<typeof normalizeProductTranslations>,
) {
  if (translations.length === 0) return;
  await transaction.insert(catalogProductTranslation).values(
    translations.map((translation) => ({ productId, ...translation })),
  );
}

async function insertProductValues(
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

async function insertProductMedia(
  transaction: CatalogTransaction,
  productId: string,
  media: ReturnType<typeof normalizeMedia>,
) {
  for (const item of media) {
    const mediaId = randomUUID();
    await transaction.insert(catalogProductMedia).values({
      id: mediaId,
      productId,
      reference: item.reference,
      displayOrder: item.displayOrder,
      isPrimary: item.isPrimary,
      isSocialImage: item.isSocialImage,
    });

    if (item.translations.length > 0) {
      await transaction.insert(catalogProductMediaTranslation).values(
        item.translations.map((translation) => ({
          productMediaId: mediaId,
          ...translation,
        })),
      );
    }
  }
}

export async function createCatalogProduct(input: CreateCatalogProductInput) {
  assertIdentifier(input.primaryCategoryId);
  const internalName = normalizeRequiredText(
    input.internalName,
    CATALOG_INTERNAL_NAME_MAX_LENGTH,
  );
  const brand = normalizeBrand(input.brand);
  const slug = validateSlug(input.slug);
  const gtin = normalizeGtin(input.gtin);
  const mpn = normalizeMpn(input.mpn);
  validateCommerceInput(input);
  const translations = normalizeProductTranslations(input.translations ?? []);
  const media = normalizeMedia(input.media ?? []);
  const additionalCategoryIds = input.additionalCategoryIds ?? [];

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    await assertProductCategories(
      transaction,
      input.primaryCategoryId,
      additionalCategoryIds,
      false,
      true,
    );

    const [created] = await transaction
      .insert(catalogProduct)
      .values({
        internalName,
        brand,
        slug,
        salesMode: input.salesMode,
        primaryCategoryId: input.primaryCategoryId,
        availability: input.availability,
        gtin,
        mpn,
        pricePresentation: input.price.presentation,
        priceEntryBasis: input.price.entryBasis,
        priceInputMinor: input.price.inputMinor,
      })
      .returning({
        id: catalogProduct.id,
        sku: catalogProduct.sku,
        slug: catalogProduct.slug,
        status: catalogProduct.status,
        updatedAt: catalogProduct.updatedAt,
      });

    if (additionalCategoryIds.length > 0) {
      await transaction.insert(catalogProductAdditionalCategory).values(
        additionalCategoryIds.map((categoryId) => ({
          productId: created.id,
          categoryId,
        })),
      );
    }

    await insertProductTranslations(transaction, created.id, translations);
    await insertProductValues(
      transaction,
      created.id,
      input.primaryCategoryId,
      input.specificationValues ?? [],
    );
    await insertProductMedia(transaction, created.id, media);
    return { ...created, updatedAt: created.updatedAt.toISOString() };
  });
}

export async function updateCatalogProduct(input: UpdateCatalogProductInput) {
  assertIdentifier(input.productId);
  assertIdentifier(input.primaryCategoryId);
  const internalName = normalizeRequiredText(
    input.internalName,
    CATALOG_INTERNAL_NAME_MAX_LENGTH,
  );
  const brand = normalizeBrand(input.brand);
  const slug = validateSlug(input.slug);
  const gtin = normalizeGtin(input.gtin);
  const mpn = normalizeMpn(input.mpn);
  validateCommerceInput(input);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);

    if (product.publishedAt && slug !== product.slug) {
      throw new CatalogManagementError("SLUG_IMMUTABLE");
    }

    if (input.primaryCategoryId !== product.primaryCategoryId) {
      const [dependentValue] = await transaction
        .select({ productId: catalogProductSpecificationValue.productId })
        .from(catalogProductSpecificationValue)
        .where(eq(catalogProductSpecificationValue.productId, product.id))
        .limit(1);
      if (dependentValue) throw new CatalogManagementError("DEPENDENCY_EXISTS");
    }

    const additionalCategoryIds = await getProductAdditionalCategoryIds(
      transaction,
      product.id,
    );
    const lockCategories = product.status === "published";
    await assertProductCategories(
      transaction,
      input.primaryCategoryId,
      additionalCategoryIds,
      lockCategories,
      lockCategories,
      lockCategories ? [product.primaryCategoryId] : [],
    );
    const updatedAt = new Date();
    const [updated] = await transaction
      .update(catalogProduct)
      .set({
        internalName,
        brand,
        slug,
        salesMode: input.salesMode,
        primaryCategoryId: input.primaryCategoryId,
        availability: input.availability,
        gtin,
        mpn,
        pricePresentation: input.price.presentation,
        priceEntryBasis: input.price.entryBasis,
        priceInputMinor: input.price.inputMinor,
        updatedAt,
      })
      .where(eq(catalogProduct.id, product.id))
      .returning({
        id: catalogProduct.id,
        sku: catalogProduct.sku,
        status: catalogProduct.status,
        updatedAt: catalogProduct.updatedAt,
      });

    if (product.status === "published") {
      const aggregate = await getProductPublicationAggregate(
        transaction,
        product.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
    }

    return { ...updated, updatedAt: updated.updatedAt.toISOString() };
  });
}

export async function replaceCatalogProductTranslations(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  translations: CatalogProductTranslationInput[];
}) {
  assertIdentifier(input.productId);
  const translations = normalizeProductTranslations(input.translations);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);

    if (product.status === "published" && !hasAllCatalogLocales(translations)) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }

    await transaction
      .delete(catalogProductTranslation)
      .where(eq(catalogProductTranslation.productId, product.id));
    await insertProductTranslations(transaction, product.id, translations);
    return touchProduct(transaction, product.id);
  });
}

export async function replaceCatalogProductCategories(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  additionalCategoryIds: string[];
}) {
  assertIdentifier(input.productId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);
    const currentAdditionalCategoryIds =
      await getProductAdditionalCategoryIds(transaction, product.id);
    const lockCategories = product.status === "published";
    await assertProductCategories(
      transaction,
      product.primaryCategoryId,
      input.additionalCategoryIds,
      lockCategories,
      lockCategories,
      lockCategories ? currentAdditionalCategoryIds : [],
    );
    await transaction
      .delete(catalogProductAdditionalCategory)
      .where(eq(catalogProductAdditionalCategory.productId, product.id));

    if (input.additionalCategoryIds.length > 0) {
      await transaction.insert(catalogProductAdditionalCategory).values(
        input.additionalCategoryIds.map((categoryId) => ({
          productId: product.id,
          categoryId,
        })),
      );
    }

    return touchProduct(transaction, product.id);
  });
}

export async function replaceCatalogProductSpecificationValues(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  values: CatalogProductSpecificationValueInput[];
}) {
  assertIdentifier(input.productId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);
    await transaction
      .delete(catalogProductSpecificationValue)
      .where(eq(catalogProductSpecificationValue.productId, product.id));
    await insertProductValues(
      transaction,
      product.id,
      product.primaryCategoryId,
      input.values,
    );

    if (product.status === "published") {
      const aggregate = await getProductPublicationAggregate(
        transaction,
        product.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
    }

    return touchProduct(transaction, product.id);
  });
}

export async function replaceCatalogProductMedia(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  media: CatalogProductMediaInput[];
}) {
  assertIdentifier(input.productId);
  const media = normalizeMedia(input.media);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);

    if (
      product.status === "published" &&
      (media.length === 0 ||
        media.filter(({ isPrimary }) => isPrimary).length !== 1 ||
        media.some((item) => !hasAllCatalogLocales(item.translations)))
    ) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }

    await transaction
      .delete(catalogProductMedia)
      .where(eq(catalogProductMedia.productId, product.id));
    await insertProductMedia(transaction, product.id, media);
    return touchProduct(transaction, product.id);
  });
}

async function touchProduct(
  transaction: CatalogTransaction,
  productId: string,
) {
  const updatedAt = new Date();
  await transaction
    .update(catalogProduct)
    .set({ updatedAt })
    .where(eq(catalogProduct.id, productId));
  return { id: productId, updatedAt: updatedAt.toISOString() };
}

function assertProductPublishable(
  aggregate: NonNullable<
    Awaited<ReturnType<typeof getProductPublicationAggregate>>
  >,
) {
  const product = aggregate.product;
  validateSlug(product.slug);
  normalizeBrand(product.brand);
  normalizeGtin(product.gtin);
  normalizeMpn(product.mpn);
  validateCommerceInput({
    salesMode: product.salesMode as CatalogSalesMode,
    availability: product.availability as CatalogAvailability | null,
    price:
      product.pricePresentation === "on_request"
        ? { presentation: "on_request", entryBasis: null, inputMinor: null }
        : {
            presentation: product.pricePresentation as "exact" | "from",
            entryBasis: product.priceEntryBasis as "vat_inclusive" | "vat_exclusive",
            inputMinor: product.priceInputMinor ?? BigInt(0),
          },
  });

  if (
    aggregate.categories.length !==
      1 + aggregate.additionalCategories.length ||
    aggregate.categories.some(({ status }) => status !== "published") ||
    !hasAllCatalogLocales(aggregate.translations)
  ) {
    throw new CatalogManagementError("PUBLICATION_INVALID");
  }

  const valueBySpecification = new Map(
    aggregate.specificationValues.map((value) => [
      value.specificationId,
      value,
    ]),
  );
  const selectedOptionById = new Map(
    aggregate.selectedOptions.map((option) => [option.id, option]),
  );

  for (const specification of aggregate.specifications) {
    const value = valueBySpecification.get(specification.id);

    if (specification.isRequired && !value) {
      throw new CatalogManagementError("PUBLICATION_INVALID");
    }

    if (!value) continue;

    const valid =
      (specification.valueType === "text" && value.textValue !== null) ||
      (specification.valueType === "number" && value.numberValue !== null) ||
      (specification.valueType === "boolean" && value.booleanValue !== null) ||
      (specification.valueType === "selection" &&
        value.selectionOptionId !== null &&
        selectedOptionById.get(value.selectionOptionId)?.specificationId ===
          specification.id);

    if (!valid) throw new CatalogManagementError("PUBLICATION_INVALID");
  }

  if (
    aggregate.media.length === 0 ||
    aggregate.media.filter(({ isPrimary }) => isPrimary).length !== 1 ||
    aggregate.media.filter(({ isSocialImage }) => isSocialImage).length > 1 ||
    aggregate.media.some(
      (media) =>
        !hasAllCatalogLocales(
          aggregate.mediaTranslations.filter(
            ({ productMediaId }) => productMediaId === media.id,
          ),
        ),
    )
  ) {
    throw new CatalogManagementError("PUBLICATION_INVALID");
  }
}

async function transitionCatalogProduct(input: {
  actorId: string;
  productId: string;
  expectedUpdatedAt: string;
  intent: "publish" | "unpublish" | "archive" | "restore";
}) {
  assertIdentifier(input.productId);

  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const product = await lockCatalogProduct(transaction, input.productId);
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.updatedAt, input.expectedUpdatedAt);
    const updatedAt = new Date();

    if (input.intent === "publish") {
      if (product.status !== "draft") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const additionalCategoryIds = await getProductAdditionalCategoryIds(
        transaction,
        product.id,
      );
      await assertProductCategories(
        transaction,
        product.primaryCategoryId,
        additionalCategoryIds,
        true,
        true,
      );

      const aggregate = await getProductPublicationAggregate(
        transaction,
        product.id,
      );
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
      await transaction
        .update(catalogProduct)
        .set({
          status: "published",
          publishedAt: product.publishedAt ?? updatedAt,
          archivedAt: null,
          updatedAt,
        })
        .where(eq(catalogProduct.id, product.id));
    } else if (input.intent === "archive") {
      if (product.status === "archived") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await transaction
        .update(catalogProduct)
        .set({ status: "archived", archivedAt: updatedAt, updatedAt })
        .where(eq(catalogProduct.id, product.id));
    } else if (input.intent === "restore") {
      if (product.status !== "archived") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      const additionalCategoryIds = await getProductAdditionalCategoryIds(
        transaction,
        product.id,
      );
      await assertProductCategories(
        transaction,
        product.primaryCategoryId,
        additionalCategoryIds,
        false,
        true,
      );

      await transaction
        .update(catalogProduct)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogProduct.id, product.id));
    } else {
      if (product.status !== "published") {
        throw new CatalogManagementError("INVALID_INPUT");
      }

      await transaction
        .update(catalogProduct)
        .set({ status: "draft", archivedAt: null, updatedAt })
        .where(eq(catalogProduct.id, product.id));
    }

    return {
      id: product.id,
      status:
        input.intent === "publish"
          ? "published"
          : input.intent === "archive"
            ? "archived"
            : "draft",
      publishedAt: (product.publishedAt ??
        (input.intent === "publish" ? updatedAt : null))?.toISOString() ?? null,
      updatedAt: updatedAt.toISOString(),
    };
  });
}

export const publishCatalogProduct = (input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">) =>
  transitionCatalogProduct({ ...input, intent: "publish" });
export const unpublishCatalogProduct = (input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">) =>
  transitionCatalogProduct({ ...input, intent: "unpublish" });
export const archiveCatalogProduct = (input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">) =>
  transitionCatalogProduct({ ...input, intent: "archive" });
export const restoreCatalogProduct = (input: Omit<Parameters<typeof transitionCatalogProduct>[0], "intent">) =>
  transitionCatalogProduct({ ...input, intent: "restore" });

export function catalogHasEveryLocale(locales: string[]) {
  return catalogLocales.every((locale) => locales.includes(locale));
}
