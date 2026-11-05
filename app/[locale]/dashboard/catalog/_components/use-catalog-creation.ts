import {
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import type {
  CatalogWorkspaceProps,
  EditorSection,
  NewCategorySeed,
} from "./catalog-editor-model";

export function useCatalogCreation({
  selected,
  openSelectedOnMobile,
  rootName,
  confirmDiscard,
  lastDialogInvokerRef,
  setDirtySections,
  catalogPath,
}: {
  selected: CatalogWorkspaceProps["selected"];
  openSelectedOnMobile: boolean;
  rootName: string;
  confirmDiscard: () => boolean;
  lastDialogInvokerRef: RefObject<HTMLElement | null>;
  setDirtySections: Dispatch<SetStateAction<Set<EditorSection>>>;
  catalogPath: string;
}) {
  const router = useRouter();
  const [mobileEditorOpen, setMobileEditorOpen] = useState(
    Boolean(selected) && openSelectedOnMobile,
  );
  const [createParent, setCreateParent] = useState<{
    id: string | null;
    name: string;
  }>({ id: null, name: rootName });
  const [createName, setCreateName] = useState("");
  const [newCategory, setNewCategory] = useState<NewCategorySeed | null>(null);
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const createContinuedRef = useRef(false);

  const openCreate = (parentId: string | null, parentName: string) => {
    if (!confirmDiscard()) return;
    setNewCategory(null);
    lastDialogInvokerRef.current = document.activeElement as HTMLElement | null;
    createContinuedRef.current = false;
    setCreateParent({ id: parentId, name: parentName });
    setCreateName("");
    createDialogRef.current?.showModal();
  };
  const closeEditor = () => {
    if (!confirmDiscard()) return;
    setNewCategory(null);
    setMobileEditorOpen(false);
  };
  const handleCreated = (categoryId: string) => {
    setNewCategory(null);
    setDirtySections(new Set());
    setMobileEditorOpen(true);
    router.push(catalogPath + "?category=" + categoryId + "&view=category");
  };

  return {
    mobileEditorOpen,
    setMobileEditorOpen,
    createParent,
    createName,
    setCreateName,
    newCategory,
    setNewCategory,
    createDialogRef,
    createContinuedRef,
    openCreate,
    closeEditor,
    handleCreated,
  };
}
