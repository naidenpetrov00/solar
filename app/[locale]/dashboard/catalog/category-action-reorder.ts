import { isUuid } from "@/lib/catalog/model";
import { isValidTimestamp } from "./category-action-context";

export function parseReorderCategories(value: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  const categories: Array<{
    id: string;
    sortOrder: number;
    expectedUpdatedAt: string;
  }> = [];

  for (const candidate of parsed) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      typeof candidate.id !== "string" ||
      !isUuid(candidate.id) ||
      !("sortOrder" in candidate) ||
      typeof candidate.sortOrder !== "number" ||
      !Number.isSafeInteger(candidate.sortOrder) ||
      candidate.sortOrder < 0 ||
      !("expectedUpdatedAt" in candidate) ||
      typeof candidate.expectedUpdatedAt !== "string" ||
      !isValidTimestamp(candidate.expectedUpdatedAt)
    ) {
      return null;
    }

    categories.push({
      id: candidate.id,
      sortOrder: candidate.sortOrder,
      expectedUpdatedAt: candidate.expectedUpdatedAt,
    });
  }

  return categories;
}
