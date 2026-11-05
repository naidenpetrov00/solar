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
  | "STALE"
  | "ASSET_LIMIT_REACHED"
  | "UPLOAD_EXPIRED"
  | "STORAGE_ERROR";

export class CatalogManagementError extends Error {
  constructor(
    readonly code: CatalogManagementErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = "CatalogManagementError";
  }
}
