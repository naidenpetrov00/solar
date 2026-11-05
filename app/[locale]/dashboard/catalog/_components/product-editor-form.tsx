import { ProductEditorHiddenFields } from "./product-editor-hidden-fields";
import { ProductEditorSections } from "./product-editor-sections";
import { ProductSaveActions } from "./product-save-actions";
import type { ProductEditorController } from "./use-product-editor-controller";
export function ProductEditorForm({
  editor,
}: {
  editor: ProductEditorController;
}) {
  const { props, detail, creating, draft, save, previewTriggerRef } = editor;
  const {
    saveResult,
    saveAction,
    savePending,
    setCreationSubmissionLocked,
    submittedRevisionRef,
    revisionRef,
    saveIssuesRef,
    reloadFromServer,
  } = save;
  return (
    <form
      action={saveAction}
      aria-busy={savePending}
      onSubmit={() => {
        submittedRevisionRef.current = revisionRef.current;
        if (creating) setCreationSubmissionLocked(true);
      }}
    >
      <ProductEditorHiddenFields editor={editor} />
      <ProductEditorSections editor={editor} />
      <ProductSaveActions
        props={props}
        detail={detail}
        saveResult={saveResult}
        savePending={savePending}
        creating={creating}
        reloadFromServer={reloadFromServer}
        saveIssuesRef={saveIssuesRef}
        previewTriggerRef={previewTriggerRef}
        setIsPreviewing={draft.setIsPreviewing}
      />
    </form>
  );
}
