import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { manageCatalogCategoryAction } from "../category-action-manage";
import type { CatalogActionResult } from "../category-action-model";
import type {
  CatalogWorkspaceProps,
  LifecycleIntent,
  EditorSection,
} from "./catalog-editor-model";
import { initialCatalogActionResult } from "./catalog-editor-model";
import { buildCategoryReorderFormData } from "./catalog-reorder";
import { eligibleCategoryParents } from "./catalog-parent-options";

export function useCatalogManagement({
  selected,
  categories,
  locale,
  confirmDiscard,
  setDirtySections,
  setEditorRevision,
}: {
  selected: CatalogWorkspaceProps["selected"];
  categories: CatalogWorkspaceProps["categories"];
  locale: string;
  confirmDiscard: () => boolean;
  setDirtySections: Dispatch<SetStateAction<Set<EditorSection>>>;
  setEditorRevision: Dispatch<SetStateAction<number>>;
}) {
  const router = useRouter();
  const [moveParentId, setMoveParentId] = useState(selected?.parentId ?? "");
  const [lifecycleIntent, setLifecycleIntent] =
    useState<LifecycleIntent | null>(null);
  const [manageResult, setManageResult] = useState<CatalogActionResult>(
    initialCatalogActionResult,
  );
  const [managePending, startManageTransition] = useTransition();
  const moveDialogRef = useRef<HTMLDialogElement>(null);
  const lifecycleDialogRef = useRef<HTMLDialogElement>(null);
  const lastDialogInvokerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (manageResult.status === "success") {
      moveDialogRef.current?.close();
      lifecycleDialogRef.current?.close();
    }
  }, [manageResult.status]);

  const runManagementAction = (formData: FormData) => {
    if (managePending) return;
    startManageTransition(async () => {
      setManageResult(await manageCatalogCategoryAction(formData));
    });
  };
  const reorder = (categoryId: string, direction: -1 | 1) => {
    if (!confirmDiscard()) return;
    setManageResult(initialCatalogActionResult);
    const formData = buildCategoryReorderFormData(
      categories,
      locale,
      categoryId,
      direction,
    );
    if (formData) runManagementAction(formData);
  };
  const eligibleParents = useMemo(
    () => eligibleCategoryParents(categories, selected?.id ?? ""),
    [categories, selected?.id],
  );
  const reloadLatest = () => {
    moveDialogRef.current?.close();
    lifecycleDialogRef.current?.close();
    setManageResult(initialCatalogActionResult);
    setDirtySections(new Set());
    setEditorRevision((current) => current + 1);
    router.refresh();
  };
  const openMove = () => {
    if (!selected || !confirmDiscard()) return;
    setManageResult(initialCatalogActionResult);
    lastDialogInvokerRef.current = document.activeElement as HTMLElement | null;
    setMoveParentId(selected.parentId ?? "");
    moveDialogRef.current?.showModal();
  };
  const openLifecycle = (intent: LifecycleIntent) => {
    if (!selected || !confirmDiscard()) return;
    setManageResult(initialCatalogActionResult);
    if (intent === "publish" && selected.publicationIssues.length > 0) {
      requestAnimationFrame(() =>
        document.getElementById("catalog-publication-issue-first")?.focus(),
      );
      return;
    }
    lastDialogInvokerRef.current = document.activeElement as HTMLElement | null;
    setLifecycleIntent(intent);
    requestAnimationFrame(() => lifecycleDialogRef.current?.showModal());
  };

  return {
    moveParentId,
    setMoveParentId,
    lifecycleIntent,
    manageResult,
    managePending,
    moveDialogRef,
    lifecycleDialogRef,
    lastDialogInvokerRef,
    runManagementAction,
    reorder,
    eligibleParents,
    reloadLatest,
    openMove,
    openLifecycle,
  };
}
