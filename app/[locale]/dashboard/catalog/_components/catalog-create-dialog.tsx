import type { Dispatch, RefObject, SetStateAction } from "react";
import type { CatalogLocale } from "@/lib/catalog/model";
import type { CatalogLabels } from "./catalog-labels";
import type { EditorSection, NewCategorySeed } from "./catalog-editor-model";
import { DashboardButton } from "./catalog-editor-actions";

export function CatalogCreateDialog({
  createDialogRef,
  createContinuedRef,
  lastDialogInvokerRef,
  confirmDiscard,
  createName,
  setCreateName,
  createParent,
  setNewCategory,
  setDirtySections,
  setMobileEditorOpen,
  currentLocale,
  labels,
  markDirty,
  clearDirty,
}: {
  createDialogRef: RefObject<HTMLDialogElement | null>;
  createContinuedRef: RefObject<boolean>;
  lastDialogInvokerRef: RefObject<HTMLElement | null>;
  confirmDiscard: () => boolean;
  createName: string;
  setCreateName: Dispatch<SetStateAction<string>>;
  createParent: { id: string | null; name: string };
  setNewCategory: Dispatch<SetStateAction<NewCategorySeed | null>>;
  setDirtySections: Dispatch<SetStateAction<Set<EditorSection>>>;
  setMobileEditorOpen: Dispatch<SetStateAction<boolean>>;
  currentLocale: CatalogLocale;
  labels: CatalogLabels;
  markDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
}) {
  return (
    <dialog
      ref={createDialogRef}
      className="dashboard-catalog-dialog"
      aria-labelledby="catalog-create-title"
      aria-describedby="catalog-create-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!confirmDiscard()) return;
        createDialogRef.current?.close();
      }}
      onClose={() => {
        if (createContinuedRef.current) {
          createContinuedRef.current = false;
          return;
        }
        lastDialogInvokerRef.current?.focus();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const name = createName.trim();
          if (!name) return;
          setNewCategory({
            parentId: createParent.id,
            parentName: createParent.name,
            initialLocale: currentLocale,
            initialName: name,
          });
          setDirtySections(new Set<EditorSection>(["content"]));
          setMobileEditorOpen(true);
          createContinuedRef.current = true;
          createDialogRef.current?.close();
        }}
      >
        <h2 id="catalog-create-title">{labels.create.title}</h2>
        <p id="catalog-create-description">{labels.create.description}</p>
        <dl>
          <dt>{labels.create.parentLabel}</dt>
          <dd>{createParent.name}</dd>
        </dl>
        <label htmlFor="catalog-create-name">
          <span>
            {labels.create.name} — {labels.languages[currentLocale]}
          </span>
          <input
            id="catalog-create-name"
            value={createName}
            onChange={(event) => {
              const value = event.target.value;
              setCreateName(value);
              if (value.trim()) markDirty("content");
              else clearDirty("content");
            }}
            required
            maxLength={200}
          />
        </label>
        <div className="dashboard-catalog-dialog-actions">
          <DashboardButton
            type="button"
            onClick={() => {
              if (!confirmDiscard()) return;
              createDialogRef.current?.close();
            }}
          >
            {labels.create.cancel}
          </DashboardButton>
          <DashboardButton type="submit">
            {labels.create.continue}
          </DashboardButton>
        </div>
      </form>
    </dialog>
  );
}
