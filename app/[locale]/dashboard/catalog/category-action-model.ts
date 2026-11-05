import type { CatalogCategoryPublicationIssue } from "@/lib/catalog/management-category-types";

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
