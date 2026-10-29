import "server-only";
import { S3CatalogAssetStorage } from "./s3-catalog-asset-storage";

export const catalogAssetStorage = new S3CatalogAssetStorage();
export type {
  CatalogAssetStorage,
  CatalogUploadPurpose,
  DirectUploadAuthorization,
  VerifiedStoredObject,
} from "./catalog-asset-storage";
export {
  catalogStorageProvider,
  CatalogStorageError,
} from "./catalog-asset-storage";
