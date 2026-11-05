import type { ProductEditorController } from "./use-product-editor-controller";
export function ProductEditorHiddenFields({
  editor,
}: {
  editor: ProductEditorController;
}) {
  const { props, detail, draft, view } = editor;
  const { locale } = props;
  const {
    primaryCategoryId,
    specValues,
    excludedSpecificationIds,
    additionalCategoryIds,
  } = draft;
  const { initialPrimaryCategoryId, serializeConfiguration } = view;
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={detail?.id ?? ""} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={detail?.updatedAt ?? ""}
      />
      <input
        type="hidden"
        name="discardSpecificationValues"
        value={
          primaryCategoryId !== initialPrimaryCategoryId ? "true" : "false"
        }
      />
      <input type="hidden" name="primaryCategoryId" value={primaryCategoryId} />
      <input
        type="hidden"
        name="specificationValues"
        value={JSON.stringify(
          specValues.filter(
            ({ specificationId }) =>
              !excludedSpecificationIds.includes(specificationId),
          ),
        )}
      />
      <input
        type="hidden"
        name="specificationConfiguration"
        value={serializeConfiguration}
      />
      {additionalCategoryIds.map((id) => (
        <input key={id} type="hidden" name="additionalCategoryIds" value={id} />
      ))}
    </>
  );
}
