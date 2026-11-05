import type { CatalogProductPublicationIssue } from "@/lib/catalog/management-product-types";
import type { CatalogActionCode } from "./category-action-model";

export type ProductActionResult = {
  status: "idle" | "success" | "error";
  code?: CatalogActionCode;
  targetId?: string;
  updatedAt?: string;
  sku?: string;
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  publicationIssues?: CatalogProductPublicationIssue[];
};
