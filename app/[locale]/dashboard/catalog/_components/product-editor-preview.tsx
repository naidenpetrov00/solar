import { CatalogProductDetail } from "../../../_components/catalog-product-detail";
import { DashboardButton } from "./product-editor-draft";
import type { ProductEditorController } from "./use-product-editor-controller";
export function ProductEditorPreview({
  editor,
}: {
  editor: ProductEditorController;
}) {
  const { labels } = editor.props;
  const { isPreviewing } = editor.draft;
  const { previewProduct, previewHeadingRef, closePreview } = editor;
  return (
    <>
      {isPreviewing ? (
        <section
          className="dashboard-catalog-product-detail-preview"
          aria-labelledby="catalog-product-preview-title"
        >
          <div className="dashboard-catalog-product-detail-preview-toolbar">
            <DashboardButton type="button" onClick={closePreview}>
              {labels.preview.back}
            </DashboardButton>
          </div>
          <h2
            id="catalog-product-preview-title"
            ref={previewHeadingRef}
            tabIndex={-1}
          >
            {labels.preview.title}
          </h2>
          <CatalogProductDetail
            product={previewProduct}
            labels={labels.preview}
          />
        </section>
      ) : null}
    </>
  );
}
