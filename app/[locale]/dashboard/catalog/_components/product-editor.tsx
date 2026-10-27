"use client";
import { ProductLifecycleDialog } from "./product-lifecycle-dialog";
import { ProductEditorPreview } from "./product-editor-preview";
import { ProductEditorOverview } from "./product-editor-overview";
import { ProductEditorForm } from "./product-editor-form";
import {
  useProductEditorController,
  type ProductEditorProps,
} from "./use-product-editor-controller";
export function ProductEditor(props: ProductEditorProps) {
  const editor = useProductEditorController(props);
  const { detail, draft, lifecycle, save } = editor;
  return (
    <article className="dashboard-catalog-editor dashboard-catalog-product-editor">
      <ProductEditorPreview editor={editor} />
      <div hidden={draft.isPreviewing}>
        <ProductEditorOverview editor={editor} />
        <ProductEditorForm editor={editor} />
        <ProductLifecycleDialog
          detail={detail}
          props={props}
          lifecycle={lifecycle}
          reloadFromServer={save.reloadFromServer}
        />
      </div>
    </article>
  );
}
