import type { CatalogWorkspaceProps } from "./catalog-editor-model";

export function eligibleCategoryParents(
  categories: CatalogWorkspaceProps["categories"],
  selectedId: string,
) {
  const descendants = new Set<string>();
  let frontier = [selectedId];

  while (frontier.length > 0) {
    const next = categories
      .filter(
        (category) =>
          category.parentId &&
          frontier.includes(category.parentId) &&
          !descendants.has(category.id),
      )
      .map(({ id }) => id);
    next.forEach((id) => descendants.add(id));
    frontier = next;
  }

  return categories.filter(
    (category) =>
      category.status !== "archived" &&
      category.id !== selectedId &&
      !descendants.has(category.id),
  );
}
