import "server-only";

export const catalogStorageProvider = "catalog-public-v1";

export type CatalogUploadPurpose =
  | "product_image"
  | "product_document"
  | "category_cover";

export type DirectUploadAuthorization = {
  url: string;
  fields: Record<string, string>;
  expiresAt: string;
};

export type VerifiedStoredObject = {
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
};

export interface CatalogAssetStorage {
  readonly provider: string;
  createDirectUploadAuthorization(input: {
    uploadId: string;
    temporaryKey: string;
    mimeType: string;
    byteSize: number;
    disposition: string;
    expiresAt: Date;
  }): Promise<DirectUploadAuthorization>;
  inspectAndPromoteUpload(input: {
    uploadId: string;
    temporaryKey: string;
    finalKey: string;
    mimeType: string;
    byteSize: number;
    disposition: string;
    purpose: CatalogUploadPurpose;
  }): Promise<VerifiedStoredObject>;
  resolvePublicAssetUrl(objectKey: string): string;
  deleteObject(objectKey: string): Promise<void>;
}

export class CatalogStorageError extends Error {
  constructor(
    readonly code:
      | "CONFIGURATION"
      | "OBJECT_NOT_FOUND"
      | "OBJECT_MISMATCH"
      | "STORAGE_FAILURE",
  ) {
    super(code);
    this.name = "CatalogStorageError";
  }
}
