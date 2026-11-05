import type { CatalogLocale } from "./model";
import type { CatalogUploadPurpose } from "@/lib/storage/catalog-asset-storage";

export type LocalizedAltText = Array<{
  locale: CatalogLocale;
  altText: string;
}>;

export type LocalizedDocumentText = Array<{
  locale: CatalogLocale;
  title: string;
  description?: string | null;
}>;

export type ManagedCatalogImage = {
  id: string;
  source: "managed" | "legacy";
  reference: string | null;
  url: string;
  originalFilename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  displayOrder: number;
  isPrimary: boolean;
  isSocialImage: boolean;
  translations: LocalizedAltText;
};

export type ManagedCatalogDocument = {
  id: string;
  url: string;
  originalFilename: string;
  mimeType: "application/pdf";
  byteSize: number;
  displayOrder: number;
  translations: LocalizedDocumentText;
};

export type ManagedCatalogCover = {
  url: string;
  originalFilename: string;
  width: number;
  height: number;
  translations: LocalizedAltText;
};

export type ManagedCatalogProductAssetSlice = {
  assetsUpdatedAt: string;
  images: ManagedCatalogImage[];
  documents: ManagedCatalogDocument[];
};

export type ManagedCatalogCategoryAssetSlice = {
  assetsUpdatedAt: string;
  cover: ManagedCatalogCover | null;
};

export type UploadDescriptor = {
  originalFilename: string;
  uploadFilename: string;
  mimeType: string;
  byteSize: number;
};

export type CatalogUploadAuthorization = {
  uploadId: string;
  purpose: CatalogUploadPurpose;
  url: string;
  fields: Record<string, string>;
  expiresAt: string;
};

export type FinalizeCatalogUploadInput = {
  actorId: string;
  uploadId: string;
  targetId: string;
  expectedAssetsUpdatedAt: string;
  altTranslations?: LocalizedAltText;
  documentTranslations?: LocalizedDocumentText;
};
