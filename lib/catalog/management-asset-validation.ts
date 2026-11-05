import "server-only";
import { catalogLocales } from "./model";
import { CatalogManagementError } from "./management-errors";
import type {
  LocalizedAltText,
  LocalizedDocumentText,
  UploadDescriptor,
} from "./management-asset-types";
import type { CatalogUploadPurpose } from "@/lib/storage/catalog-asset-storage";
import {
  catalogDocumentMaxBytes,
  catalogImageMaxBytes,
} from "./catalog-asset-limits";

export const imageUploadLimit = catalogImageMaxBytes;
export const documentUploadLimit = catalogDocumentMaxBytes;

const imageExtensions: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

function extension(filename: string) {
  const match = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/u);
  return match?.[1] ?? "";
}

export function validateUploadDescriptor(
  purpose: CatalogUploadPurpose,
  descriptor: UploadDescriptor,
) {
  const originalFilename = descriptor.originalFilename.trim();
  const uploadFilename = descriptor.uploadFilename.trim();
  if (
    !originalFilename ||
    !uploadFilename ||
    originalFilename.length > 255 ||
    uploadFilename.length > 255 ||
    !Number.isInteger(descriptor.byteSize) ||
    descriptor.byteSize < 1
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  if (purpose === "product_document") {
    if (
      descriptor.mimeType !== "application/pdf" ||
      extension(uploadFilename) !== "pdf" ||
      extension(originalFilename) !== "pdf" ||
      descriptor.byteSize > documentUploadLimit
    ) {
      throw new CatalogManagementError("INVALID_INPUT");
    }
    return { originalFilename, uploadFilename, extension: "pdf" };
  }
  const allowed = imageExtensions[descriptor.mimeType];
  const uploadExtension = extension(uploadFilename);
  const originalExtension = extension(originalFilename);
  if (
    !allowed?.includes(uploadExtension) ||
    !["jpg", "jpeg", "png", "webp"].includes(originalExtension) ||
    descriptor.byteSize > imageUploadLimit
  ) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  return { originalFilename, uploadFilename, extension: uploadExtension };
}

export function normalizeAltTranslations(
  value: LocalizedAltText | undefined,
  requireEveryLocale: boolean,
) {
  const result = catalogLocales.flatMap((locale) => {
    const text = value?.find((item) => item.locale === locale)?.altText.trim();
    return text ? [{ locale, altText: text.slice(0, 500) }] : [];
  });
  if (requireEveryLocale && result.length !== catalogLocales.length) {
    throw new CatalogManagementError("INVALID_INPUT");
  }
  return result;
}

export function normalizeDocumentTranslations(
  value: LocalizedDocumentText | undefined,
) {
  const result = catalogLocales.map((locale) => {
    const translation = value?.find((item) => item.locale === locale);
    const title = translation?.title.trim();
    if (!title) throw new CatalogManagementError("INVALID_INPUT");
    const description = translation?.description?.trim();
    return {
      locale,
      title: title.slice(0, 300),
      description: description ? description.slice(0, 1000) : null,
    };
  });
  return result;
}
