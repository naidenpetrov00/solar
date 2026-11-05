import { useCallback, useState } from "react";
import { useUnsavedChangesGuard } from "../../_components/use-unsaved-changes-guard";
import type { ProductEditorSection } from "./product-editor-model";
import type { EditorSection } from "./catalog-editor-model";

export function useCatalogUnsavedGuard(unsavedMessage: string) {
  const [dirtySections, setDirtySections] = useState<Set<EditorSection>>(
    () => new Set(),
  );
  const [productDirtySections, setProductDirtySections] = useState<
    Set<ProductEditorSection>
  >(() => new Set());
  const [editorRevision, setEditorRevision] = useState(0);
  const hasUnsavedChanges =
    dirtySections.size > 0 || productDirtySections.size > 0;
  const markDirty = useCallback((section: EditorSection) => {
    setDirtySections((current) => {
      const next = new Set(current);
      next.add(section);
      return next;
    });
  }, []);
  const clearDirty = useCallback((section: EditorSection) => {
    setDirtySections((current) => {
      const next = new Set(current);
      next.delete(section);
      return next;
    });
  }, []);
  const markProductDirty = useCallback((section: ProductEditorSection) => {
    setProductDirtySections((current) => {
      if (current.has(section)) return current;
      const next = new Set(current);
      next.add(section);
      return next;
    });
  }, []);
  const clearAllProductDirty = useCallback(() => {
    setProductDirtySections(new Set());
  }, []);
  const clearProductDirty = useCallback((section: ProductEditorSection) => {
    setProductDirtySections((current) => {
      const next = new Set(current);
      next.delete(section);
      return next;
    });
  }, []);
  const discard = useCallback(() => {
    setDirtySections(new Set());
    setProductDirtySections(new Set());
    setEditorRevision((current) => current + 1);
  }, []);
  const { confirmDiscard } = useUnsavedChangesGuard({
    hasUnsavedChanges,
    message: unsavedMessage,
    onDiscard: discard,
  });

  return {
    dirtySections,
    setDirtySections,
    productDirtySections,
    editorRevision,
    setEditorRevision,
    markDirty,
    clearDirty,
    markProductDirty,
    clearProductDirty,
    clearAllProductDirty,
    confirmDiscard,
  };
}
