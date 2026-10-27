import { useCallback, useEffect, useRef, useState } from "react";
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
  const skipNextPopRef = useRef(false);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
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
  const confirmDiscard = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    if (!window.confirm(unsavedMessage)) return false;
    setDirtySections(new Set());
    setProductDirtySections(new Set());
    setEditorRevision((current) => current + 1);
    return true;
  }, [hasUnsavedChanges, unsavedMessage]);

  useEffect(() => {
    const rememberFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (focusedElementRef.current !== event.target) {
        previousFocusedElementRef.current = focusedElementRef.current;
        focusedElementRef.current = event.target;
      }
    };

    document.addEventListener("focusin", rememberFocus);
    return () => document.removeEventListener("focusin", rememberFocus);
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.href === window.location.href)
        return;
      if (window.confirm(unsavedMessage)) {
        setDirtySections(new Set());
        setProductDirtySections(new Set());
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      requestAnimationFrame(() => {
        const previous = previousFocusedElementRef.current;
        if (previous?.isConnected) previous.focus();
      });
    };
    const historyIndex =
      typeof window.history.state?.idx === "number"
        ? window.history.state.idx
        : null;
    const currentHref = window.location.href;
    const popState = (event: PopStateEvent) => {
      if (skipNextPopRef.current) {
        skipNextPopRef.current = false;
        return;
      }

      if (window.confirm(unsavedMessage)) {
        setDirtySections(new Set());
        setProductDirtySections(new Set());
        return;
      }

      const nextIndex =
        typeof event.state?.idx === "number" ? event.state.idx : null;
      if (historyIndex !== null && nextIndex !== null) {
        skipNextPopRef.current = true;
        window.history.go(nextIndex < historyIndex ? 1 : -1);
      } else {
        window.history.pushState(window.history.state, "", currentHref);
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", popState);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popState);
    };
  }, [hasUnsavedChanges, unsavedMessage]);

  return {
    dirtySections,
    setDirtySections,
    productDirtySections,
    editorRevision,
    setEditorRevision,
    markDirty,
    clearDirty,
    markProductDirty,
    clearAllProductDirty,
    confirmDiscard,
  };
}
