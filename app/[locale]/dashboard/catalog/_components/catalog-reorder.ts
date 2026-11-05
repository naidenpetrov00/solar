import type { CatalogWorkspaceProps } from "./catalog-editor-model";

export function buildCategoryReorderFormData(
  categories: CatalogWorkspaceProps["categories"],
  locale: string,
  categoryId: string,
  direction: -1 | 1,
): FormData | null {
  const category = categories.find(({ id }) => id === categoryId);
  if (!category) return null;
  const siblings = categories.filter(
    (candidate) => candidate.parentId === category.parentId,
  );
  const index = siblings.findIndex(({ id }) => id === categoryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return null;
  const adjacent = siblings[target];
  const samePosition = category.sortOrder === adjacent.sortOrder;
  const categorySortOrder = samePosition
    ? direction < 0
      ? category.sortOrder
      : category.sortOrder + 1
    : adjacent.sortOrder;
  const adjacentSortOrder = samePosition
    ? direction < 0
      ? adjacent.sortOrder + 1
      : adjacent.sortOrder
    : category.sortOrder;
  const formData = new FormData();
  formData.set("locale", locale);
  formData.set("categoryId", categoryId);
  formData.set("expectedUpdatedAt", category.updatedAt);
  formData.set("intent", "reorder");
  formData.set(
    "categories",
    JSON.stringify([
      {
        id: category.id,
        sortOrder: categorySortOrder,
        expectedUpdatedAt: category.updatedAt,
      },
      {
        id: adjacent.id,
        sortOrder: adjacentSortOrder,
        expectedUpdatedAt: adjacent.updatedAt,
      },
    ]),
  );

  return formData;
}
