import type { PublicCatalogSort } from "@/lib/catalog/public-types";
import { publicCatalogSorts } from "@/lib/catalog/public-types";

export type PublicCatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ParsedPublicCatalogQuery = {
  sort: PublicCatalogSort;
  values: Map<string, string[]>;
  minimums: Map<string, string>;
  maximums: Map<string, string>;
};

const decimalPattern = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/u;

function queryValues(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 200)
    .slice(0, 50);
}

function validDecimal(value: string | undefined) {
  if (!value || value.length > 24 || !decimalPattern.test(value)) return null;
  return Number.isFinite(Number(value)) ? value : null;
}

export function parsePublicCatalogQuery(
  searchParams: PublicCatalogSearchParams,
): ParsedPublicCatalogQuery {
  const requestedSort = Array.isArray(searchParams.sort)
    ? searchParams.sort[0]
    : searchParams.sort;
  const sort = publicCatalogSorts.includes(requestedSort as PublicCatalogSort)
    ? (requestedSort as PublicCatalogSort)
    : "name-asc";
  const values = new Map<string, string[]>();
  const minimums = new Map<string, string>();
  const maximums = new Map<string, string>();

  for (const [key, rawValue] of Object.entries(searchParams).slice(0, 150)) {
    if (key.startsWith("f.")) {
      const specificationId = key.slice(2);
      const selected = [...new Set(queryValues(rawValue))];
      if (specificationId && selected.length > 0) {
        values.set(specificationId, selected);
      }
    } else if (key.startsWith("min.")) {
      const specificationId = key.slice(4);
      const value = validDecimal(queryValues(rawValue)[0]);
      if (specificationId && value) minimums.set(specificationId, value);
    } else if (key.startsWith("max.")) {
      const specificationId = key.slice(4);
      const value = validDecimal(queryValues(rawValue)[0]);
      if (specificationId && value) maximums.set(specificationId, value);
    }
  }

  return { sort, values, minimums, maximums };
}

export function hasPublicCatalogQueryState(
  searchParams: PublicCatalogSearchParams,
) {
  return Object.entries(searchParams).some(([key, value]) => {
    if (key === "sort") {
      const sort = Array.isArray(value) ? value[0] : value;
      return sort !== undefined && sort !== "name-asc";
    }
    return (
      key.startsWith("f.") ||
      key.startsWith("min.") ||
      key.startsWith("max.")
    );
  });
}
