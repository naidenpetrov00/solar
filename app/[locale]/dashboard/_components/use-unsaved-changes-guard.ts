"use client";

import { useCallback, useEffect, useRef } from "react";

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  message,
  onDiscard,
}: {
  hasUnsavedChanges: boolean;
  message: string;
  onDiscard: () => void;
}) {
  const skipNextPopRef = useRef(false);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const confirmDiscard = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    if (!window.confirm(message)) return false;
    onDiscard();
    return true;
  }, [hasUnsavedChanges, message, onDiscard]);

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
    const discard = () => onDiscard();
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
      ) return;
      const anchor = event.target instanceof Element
        ? event.target.closest("a[href]")
        : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.href === window.location.href
      ) return;
      if (window.confirm(message)) {
        discard();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      requestAnimationFrame(() => {
        const previous = previousFocusedElementRef.current;
        if (previous?.isConnected) previous.focus();
      });
    };
    const historyIndex = typeof window.history.state?.idx === "number"
      ? window.history.state.idx
      : null;
    const currentHref = window.location.href;
    const popState = (event: PopStateEvent) => {
      if (skipNextPopRef.current) {
        skipNextPopRef.current = false;
        return;
      }
      if (window.confirm(message)) {
        discard();
        return;
      }
      const nextIndex = typeof event.state?.idx === "number" ? event.state.idx : null;
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
  }, [hasUnsavedChanges, message, onDiscard]);

  return { confirmDiscard };
}
