import { useRef, useState, useTransition, type FormEvent } from "react";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import { manageCatalogProductAction } from "../product-actions";
import type { ProductActionResult } from "../product-action-model";
import {
  initialResult,
  type LifecycleIntent,
  type ProductEditorSection,
} from "./product-editor-model";

export function useProductLifecycle({
  detail,
  dirtySections,
  confirmDiscard,
  resetFromDetail,
  clearAllDirty,
}: {
  detail: ManagedCatalogProductDetail | null;
  dirtySections: Set<ProductEditorSection>;
  confirmDiscard: () => boolean;
  resetFromDetail: (detail: ManagedCatalogProductDetail) => void;
  clearAllDirty: () => void;
}) {
  const [result, setResult] = useState<ProductActionResult>(initialResult);
  const [pending, startLifecycle] = useTransition();
  const [intent, setIntent] = useState<LifecycleIntent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const invoker = useRef<HTMLButtonElement | null>(null);

  const open = (nextIntent: LifecycleIntent, button: HTMLButtonElement) => {
    if (dirtySections.size > 0 && !confirmDiscard()) return;
    if (detail) resetFromDetail(detail);
    clearAllDirty();
    setResult(initialResult);
    setIntent(nextIntent);
    invoker.current = button;
    dialog.current?.showModal();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startLifecycle(async () => {
      const nextResult = await manageCatalogProductAction(formData);
      setResult(nextResult);
      if (nextResult.status === "success") dialog.current?.close();
    });
  };

  return { result, pending, intent, dialog, invoker, open, submit };
}
