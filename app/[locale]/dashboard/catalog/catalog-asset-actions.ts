"use server";

import { after } from "next/server";
import type {
  CatalogUploadAuthorization,
  LocalizedAltText,
  LocalizedDocumentText,
  ManagedCatalogCategoryAssetSlice,
  ManagedCatalogProductAssetSlice,
  UploadDescriptor,
} from "@/lib/catalog/management-asset-types";
import { authorizeCatalogUploads } from "@/lib/catalog/management-asset-uploads";
import { finalizeCatalogUpload } from "@/lib/catalog/management-asset-finalize";
import {
  deleteCatalogCategoryCover,
  deleteCatalogProductDocument,
  deleteCatalogProductImage,
} from "@/lib/catalog/management-asset-delete";
import {
  saveCatalogCategoryCoverAlt,
  saveCatalogProductDocuments,
  saveCatalogProductImages,
} from "@/lib/catalog/management-asset-metadata";
import {
  getManagedCatalogCategoryAsset,
  getManagedCatalogProductAssets,
} from "@/lib/catalog/management-asset-read";
import { cleanupCatalogAssets } from "@/lib/catalog/management-asset-cleanup";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import { abandonCatalogUpload } from "@/lib/catalog/management-asset-abandon";
import type { CatalogUploadPurpose } from "@/lib/storage/catalog-asset-storage";
import { AuthorizationError } from "@/lib/permission-policy";
import {
  isSupportedLocale,
  requireCatalogManager,
  revalidateCatalog,
} from "./category-action-context";

export type CatalogAssetActionResult<T> =
  | { status: "success"; data: T }
  | {
      status: "error";
      code:
        | "ASSET_LIMIT_REACHED"
        | "FORBIDDEN"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "PUBLICATION_INVALID"
        | "STALE"
        | "STORAGE_ERROR"
        | "UPLOAD_EXPIRED";
    };

function actionError<T>(error: unknown): CatalogAssetActionResult<T> {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN" };
  }
  if (error instanceof CatalogManagementError) {
    if (
      error.code === "ASSET_LIMIT_REACHED" ||
      error.code === "FORBIDDEN" ||
      error.code === "INVALID_INPUT" ||
      error.code === "NOT_FOUND" ||
      error.code === "PUBLICATION_INVALID" ||
      error.code === "STALE" ||
      error.code === "STORAGE_ERROR" ||
      error.code === "UPLOAD_EXPIRED"
    ) {
      return { status: "error", code: error.code };
    }
  }
  return { status: "error", code: "INVALID_INPUT" };
}

function scheduleCleanup() {
  after(async () => {
    await cleanupCatalogAssets();
  });
}

function revalidate(locale: string) {
  if (isSupportedLocale(locale)) revalidateCatalog(locale);
}

export async function authorizeCatalogUploadsAction(input: {
  locale: string;
  targetId: string;
  expectedAssetsUpdatedAt: string;
  purpose: CatalogUploadPurpose;
  files: UploadDescriptor[];
}): Promise<CatalogAssetActionResult<CatalogUploadAuthorization[]>> {
  try {
    const actor = await requireCatalogManager();
    const data = await authorizeCatalogUploads({ ...input, actorId: actor.id });
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function getCatalogProductAssetsAction(input: {
  productId: string;
}): Promise<CatalogAssetActionResult<ManagedCatalogProductAssetSlice>> {
  try {
    const actor = await requireCatalogManager();
    const data = await getManagedCatalogProductAssets(actor.id, input.productId);
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function getCatalogCategoryAssetAction(input: {
  categoryId: string;
}): Promise<CatalogAssetActionResult<ManagedCatalogCategoryAssetSlice>> {
  try {
    const actor = await requireCatalogManager();
    const data = await getManagedCatalogCategoryAsset(actor.id, input.categoryId);
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function abandonCatalogUploadAction(input: {
  uploadId: string;
}): Promise<CatalogAssetActionResult<null>> {
  try {
    const actor = await requireCatalogManager();
    await abandonCatalogUpload(actor.id, input.uploadId);
    scheduleCleanup();
    return { status: "success", data: null };
  } catch (error) {
    return actionError(error);
  }
}

export async function finalizeCatalogUploadAction(input: {
  locale: string;
  uploadId: string;
  targetId: string;
  expectedAssetsUpdatedAt: string;
  altTranslations?: LocalizedAltText;
  documentTranslations?: LocalizedDocumentText;
}): Promise<
  CatalogAssetActionResult<
    ManagedCatalogProductAssetSlice | ManagedCatalogCategoryAssetSlice
  >
> {
  try {
    const actor = await requireCatalogManager();
    const finalized = await finalizeCatalogUpload({ ...input, actorId: actor.id });
    const data = finalized.purpose === "category_cover"
      ? await getManagedCatalogCategoryAsset(actor.id, input.targetId)
      : await getManagedCatalogProductAssets(actor.id, input.targetId);
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveCatalogProductImagesAction(input: {
  locale: string;
  productId: string;
  expectedAssetsUpdatedAt: string;
  images: Array<{
    id: string;
    reference: string | null;
    isPrimary: boolean;
    isSocialImage: boolean;
    translations: LocalizedAltText;
  }>;
}): Promise<CatalogAssetActionResult<ManagedCatalogProductAssetSlice>> {
  try {
    const actor = await requireCatalogManager();
    await saveCatalogProductImages({ ...input, actorId: actor.id });
    const data = await getManagedCatalogProductAssets(actor.id, input.productId);
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveCatalogProductDocumentsAction(input: {
  locale: string;
  productId: string;
  expectedAssetsUpdatedAt: string;
  documents: Array<{ id: string; translations: LocalizedDocumentText }>;
}): Promise<CatalogAssetActionResult<ManagedCatalogProductAssetSlice>> {
  try {
    const actor = await requireCatalogManager();
    await saveCatalogProductDocuments({ ...input, actorId: actor.id });
    const data = await getManagedCatalogProductAssets(actor.id, input.productId);
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCatalogProductImageAction(input: {
  locale: string;
  productId: string;
  mediaId: string;
  expectedAssetsUpdatedAt: string;
}): Promise<CatalogAssetActionResult<ManagedCatalogProductAssetSlice & { cleanupPending: boolean }>> {
  try {
    const actor = await requireCatalogManager();
    const deletion = await deleteCatalogProductImage({ ...input, actorId: actor.id });
    const slice = await getManagedCatalogProductAssets(actor.id, input.productId);
    const data = { ...slice, cleanupPending: deletion.cleanupPending };
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCatalogProductDocumentAction(input: {
  locale: string;
  productId: string;
  documentId: string;
  expectedAssetsUpdatedAt: string;
}): Promise<CatalogAssetActionResult<ManagedCatalogProductAssetSlice & { cleanupPending: boolean }>> {
  try {
    const actor = await requireCatalogManager();
    const deletion = await deleteCatalogProductDocument({ ...input, actorId: actor.id });
    const slice = await getManagedCatalogProductAssets(actor.id, input.productId);
    const data = { ...slice, cleanupPending: deletion.cleanupPending };
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveCatalogCategoryCoverAltAction(input: {
  locale: string;
  categoryId: string;
  expectedAssetsUpdatedAt: string;
  translations: LocalizedAltText;
}): Promise<CatalogAssetActionResult<ManagedCatalogCategoryAssetSlice>> {
  try {
    const actor = await requireCatalogManager();
    await saveCatalogCategoryCoverAlt({ ...input, actorId: actor.id });
    const data = await getManagedCatalogCategoryAsset(actor.id, input.categoryId);
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCatalogCategoryCoverAction(input: {
  locale: string;
  categoryId: string;
  expectedAssetsUpdatedAt: string;
}): Promise<CatalogAssetActionResult<ManagedCatalogCategoryAssetSlice & { cleanupPending: boolean }>> {
  try {
    const actor = await requireCatalogManager();
    const deletion = await deleteCatalogCategoryCover({ ...input, actorId: actor.id });
    const slice = await getManagedCatalogCategoryAsset(actor.id, input.categoryId);
    const data = { ...slice, cleanupPending: deletion.cleanupPending };
    revalidate(input.locale);
    scheduleCleanup();
    return { status: "success", data };
  } catch (error) {
    return actionError(error);
  }
}
