"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogProductAssetSlice } from "@/lib/catalog/management-asset-types";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import {
  authorizeCatalogUploadsAction,
  abandonCatalogUploadAction,
  deleteCatalogProductDocumentAction,
  deleteCatalogProductImageAction,
  finalizeCatalogUploadAction,
  getCatalogProductAssetsAction,
  saveCatalogProductDocumentsAction,
  saveCatalogProductImagesAction,
} from "../catalog-asset-actions";
import { DashboardButton } from "./product-editor-draft";
import { Field } from "./product-editor-fields";
import { CatalogSectionSaveState } from "./catalog-section-save-state";
import type { DocumentDraft, MediaDraft } from "./product-editor-model";
import {
  filenameStem,
  formatCatalogBytes,
  createCatalogClientId,
  prepareCatalogImage,
  prepareCatalogPdf,
  type PreparedCatalogFile,
  uploadCatalogFile,
} from "./catalog-upload-client";
import type { ProductMediaSectionProps } from "./product-media-model";
import {
  draftSlice,
  mergeFinalizedDraft,
  sameDraftSection,
  type ProductAssetDraftSlice,
} from "./product-media-sync";

type UploadStatus = "queued" | "optimizing" | "uploading" | "awaiting" | "finalizing" | "success" | "canceled" | "reconciliation" | "error";
type QueueItem = { id: string; file: File; status: UploadStatus; progress: number; originalSize: number; uploadSize: number | null; previewUrl?: string; error?: string };
type AssetSection = "image" | "document";
type PendingUpload = {
  uploadId: string;
  kind: AssetSection;
  defaultText: string;
  phase: "authorized" | "uploaded";
};
type SectionSyncMode = "persisted" | "finalized" | "deleted";
type SyncProductSection = (
  data: ManagedCatalogProductAssetSlice,
  section: AssetSection,
  mode: SectionSyncMode,
  deletedId?: string,
) => void;

export function ProductMediaSection(props: ProductMediaSectionProps) {
  const { labels, languages, editorDisabled, clearDirty, activeLocale, setActiveLocale, media, setMedia, documents, setDocuments, assetsUpdatedAt, setAssetsUpdatedAt, productId, productStatus, locale } = props;
  const [imageQueue, setImageQueue] = useState<QueueItem[]>([]);
  const [documentQueue, setDocumentQueue] = useState<QueueItem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageSavePending, setImageSavePending] = useState(false);
  const [documentSavePending, setDocumentSavePending] = useState(false);
  const [imageSaved, setImageSaved] = useState(false);
  const [documentsSaved, setDocumentsSaved] = useState(false);
  const [reconciliationRequired, setReconciliationRequired] = useState(false);
  const busyRef = useRef(false);
  const controllers = useRef(new Map<string, AbortController>());
  const pendingUploads = useRef(new Map<string, PendingUpload>());
  const previewByQueueId = useRef(new Map<string, string>());
  const baselineProductId = useRef(productId);
  const serverBaseline = useRef<ProductAssetDraftSlice>({
    images: media,
    documents,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const protectNavigation = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest("a[href]")
        : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank") return;
      if (!window.confirm(labels.editor.unsaved)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", protectNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", protectNavigation, true);
    };
  }, [busy, labels.editor.unsaved]);

  useEffect(() => () => {
    for (const controller of controllers.current.values()) controller.abort();
    for (const url of previewByQueueId.current.values()) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (baselineProductId.current === productId) return;
    baselineProductId.current = productId;
    serverBaseline.current = { images: media, documents };
  }, [documents, media, productId]);

  const updateQueue = (kind: "image" | "document", id: string, patch: Partial<QueueItem>) => {
    const setter = kind === "image" ? setImageQueue : setDocumentQueue;
    setter((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };
  const beginBusy = () => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    return true;
  };
  const endBusy = () => {
    busyRef.current = false;
    setBusy(false);
  };
  const syncProductSection = (
    data: ManagedCatalogProductAssetSlice,
    section: AssetSection,
    mode: SectionSyncMode,
    deletedId?: string,
  ) => {
    const previousBaseline = serverBaseline.current;
    const next = draftSlice(data);
    setAssetsUpdatedAt(data.assetsUpdatedAt);
    if (section === "image") {
      if (mode === "persisted") setMedia(next.images);
      if (mode === "finalized") {
        setMedia((current) =>
          mergeFinalizedDraft(current, previousBaseline.images, next.images),
        );
      }
      if (mode === "deleted" && deletedId) {
        setMedia((current) =>
          current.filter((item) => item.clientId !== deletedId),
        );
      }
    } else {
      if (mode === "persisted") setDocuments(next.documents);
      if (mode === "finalized") {
        setDocuments((current) =>
          mergeFinalizedDraft(
            current,
            previousBaseline.documents,
            next.documents,
          ),
        );
      }
      if (mode === "deleted" && deletedId) {
        setDocuments((current) =>
          current.filter((item) => item.clientId !== deletedId),
        );
      }
    }
    serverBaseline.current = next;
  };

  const abandonPendingUpload = async (queueId: string) => {
    const pending = pendingUploads.current.get(queueId);
    if (!pending) return true;
    try {
      const result = await abandonCatalogUploadAction({
        uploadId: pending.uploadId,
      });
      if (result.status === "error") return false;
      pendingUploads.current.delete(queueId);
      return true;
    } catch {
      return false;
    }
  };

  async function prepareFiles(kind: "image" | "document", files: File[]) {
    const prepared: Array<{ queueId: string; prepared: PreparedCatalogFile }> = [];
    for (const file of files) {
      const queueId = createCatalogClientId();
      const item: QueueItem = { id: queueId, file, status: kind === "image" ? "optimizing" : "queued", progress: 0, originalSize: file.size, uploadSize: null };
      (kind === "image" ? setImageQueue : setDocumentQueue)((current) => [...current, item]);
      try {
        const value = kind === "image" ? await prepareCatalogImage(file) : prepareCatalogPdf(file);
        const previewUrl = kind === "image" ? URL.createObjectURL(value.upload) : undefined;
        if (previewUrl) previewByQueueId.current.set(queueId, previewUrl);
        prepared.push({ queueId, prepared: value });
        updateQueue(kind, queueId, { status: "queued", uploadSize: value.upload.size, previewUrl });
      } catch (error) {
        updateQueue(kind, queueId, { status: "error", error: error instanceof Error ? error.message : "INVALID_INPUT" });
      }
    }
    return prepared;
  }

  async function runUpload(kind: "image" | "document", files: File[]) {
    if (!productId || files.length === 0 || !beginBusy()) return;
    let prepared: Array<{ queueId: string; prepared: PreparedCatalogFile }> = [];
    try {
      prepared = await prepareFiles(kind, files);
      if (prepared.length === 0) return;
      const authorization = await authorizeCatalogUploadsAction({
        locale,
        targetId: productId,
        expectedAssetsUpdatedAt: assetsUpdatedAt,
        purpose: kind === "image" ? "product_image" : "product_document",
        files: prepared.map(({ prepared: item }) => ({ originalFilename: item.original.name, uploadFilename: item.upload.name, mimeType: item.upload.type, byteSize: item.upload.size })),
      });
      if (authorization.status === "error") {
        for (const item of prepared) updateQueue(kind, item.queueId, { status: authorization.code === "STALE" ? "reconciliation" : "error", error: authorization.code });
        setAnnouncement(labels.media.errors[authorization.code] ?? authorization.code);
        if (authorization.code === "STALE") setReconciliationRequired(true);
        return;
      }

      authorization.data.forEach((authorized, index) => {
        const item = prepared[index];
        pendingUploads.current.set(item.queueId, {
          uploadId: authorized.uploadId,
          kind,
          defaultText: filenameStem(item.prepared.original.name),
          phase: "authorized",
        });
      });

      let nextIndex = 0;
      const uploaded = new Set<string>();
      await Promise.all(Array.from({ length: Math.min(3, prepared.length) }, async () => {
        while (nextIndex < prepared.length) {
          const index = nextIndex++;
          const item = prepared[index];
          const controller = new AbortController();
          controllers.current.set(item.queueId, controller);
          updateQueue(kind, item.queueId, { status: "uploading", progress: 0, error: undefined });
          try {
            await uploadCatalogFile(authorization.data[index], item.prepared.upload, controller.signal, (progress) => updateQueue(kind, item.queueId, { progress }));
            uploaded.add(item.queueId);
            const pending = pendingUploads.current.get(item.queueId);
            if (pending) pendingUploads.current.set(item.queueId, { ...pending, phase: "uploaded" });
            updateQueue(kind, item.queueId, { status: "awaiting", progress: 100 });
          } catch (error) {
            const abandoned = await abandonPendingUpload(item.queueId);
            updateQueue(kind, item.queueId, {
              status: controller.signal.aborted && abandoned ? "canceled" : "error",
              error: abandoned
                ? error instanceof Error ? error.message : "UPLOAD_FAILED"
                : "ABANDON_FAILED",
            });
          } finally {
            controllers.current.delete(item.queueId);
          }
        }
      }));

      let revision = assetsUpdatedAt;
      for (const [index, item] of prepared.entries()) {
        if (!uploaded.has(item.queueId)) continue;
        updateQueue(kind, item.queueId, { status: "finalizing", progress: 100 });
        const pending = pendingUploads.current.get(item.queueId);
        if (!pending) continue;
        let result: Awaited<ReturnType<typeof finalizeCatalogUploadAction>>;
        try {
          result = await finalizeCatalogUploadAction({
            locale,
            uploadId: pending.uploadId,
            targetId: productId,
            expectedAssetsUpdatedAt: revision,
            altTranslations: kind === "image" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: productStatus === "published" ? pending.defaultText : "" })) : undefined,
            documentTranslations: kind === "document" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, title: pending.defaultText, description: null })) : undefined,
          });
        } catch {
          updateQueue(kind, item.queueId, { status: "reconciliation", error: "NETWORK_ERROR" });
          for (const remaining of prepared.slice(index + 1)) {
            if (uploaded.has(remaining.queueId)) updateQueue(kind, remaining.queueId, { status: "reconciliation", error: "STALE" });
          }
          setReconciliationRequired(true);
          setAnnouncement(labels.media.errors.NETWORK_ERROR);
          break;
        }
        if (result.status === "error") {
          let errorCode: string = result.code;
          if (result.code === "INVALID_INPUT" || result.code === "UPLOAD_EXPIRED") {
            if (!(await abandonPendingUpload(item.queueId))) errorCode = "ABANDON_FAILED";
          }
          updateQueue(kind, item.queueId, { status: result.code === "STALE" ? "reconciliation" : "error", error: errorCode });
          if (result.code === "STALE") {
            for (const remaining of prepared.slice(index + 1)) {
              if (uploaded.has(remaining.queueId)) updateQueue(kind, remaining.queueId, { status: "reconciliation", error: "STALE" });
            }
            setAnnouncement(labels.media.statuses.reconciliation);
            setReconciliationRequired(true);
            break;
          }
          continue;
        }
        syncProductSection(result.data, kind, "finalized");
        revision = result.data.assetsUpdatedAt;
        pendingUploads.current.delete(item.queueId);
        releaseQueuePreview(item.queueId);
        updateQueue(kind, item.queueId, { status: "success", previewUrl: undefined, error: undefined });
        setAnnouncement(labels.media.statuses.success);
      }
    } catch {
      const ids = new Set(prepared.map((item) => item.queueId));
      const setter = kind === "image" ? setImageQueue : setDocumentQueue;
      setter((current) => current.map((item) => {
        if (!ids.has(item.id) || item.status === "success") return item;
        const pending = pendingUploads.current.get(item.id);
        return {
          ...item,
          status: pending?.phase === "uploaded" ? "reconciliation" : "error",
          error: "UNEXPECTED_ERROR",
        };
      }));
      setAnnouncement(labels.media.errors.UNEXPECTED_ERROR);
    } finally {
      endBusy();
    }
  }

  async function resumeFinalization(queueId: string) {
    if (!productId || !beginBusy()) return;
    const pending = pendingUploads.current.get(queueId);
    if (!pending || pending.phase !== "uploaded") { endBusy(); return; }
    try {
      const current = await reconcileAssets();
      if (!current) return;
      updateQueue(pending.kind, queueId, { status: "finalizing", error: undefined });
      const result = await finalizeCatalogUploadAction({
        locale,
        uploadId: pending.uploadId,
        targetId: productId,
        expectedAssetsUpdatedAt: current.assetsUpdatedAt,
        altTranslations: pending.kind === "image" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: productStatus === "published" ? pending.defaultText : "" })) : undefined,
        documentTranslations: pending.kind === "document" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, title: pending.defaultText, description: null })) : undefined,
      });
      if (result.status === "error") {
        let errorCode: string = result.code;
        if (result.code === "INVALID_INPUT" || result.code === "UPLOAD_EXPIRED") {
          if (!(await abandonPendingUpload(queueId))) errorCode = "ABANDON_FAILED";
        }
        updateQueue(pending.kind, queueId, { status: result.code === "STALE" ? "reconciliation" : "error", error: errorCode });
        if (result.code === "STALE") setReconciliationRequired(true);
        return;
      }
      syncProductSection(result.data, pending.kind, "finalized");
      pendingUploads.current.delete(queueId);
      releaseQueuePreview(queueId);
      updateQueue(pending.kind, queueId, { status: "success", previewUrl: undefined, error: undefined });
    } catch {
      updateQueue(pending.kind, queueId, { status: "reconciliation", error: "NETWORK_ERROR" });
      setReconciliationRequired(true);
      setAnnouncement(labels.media.errors.NETWORK_ERROR);
    } finally {
      endBusy();
    }
  }

  function releaseQueuePreview(queueId: string) {
    const previewUrl = previewByQueueId.current.get(queueId);
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    previewByQueueId.current.delete(queueId);
  }

  async function retryQueueItem(queueId: string, file: File, kind: AssetSection) {
    const pending = pendingUploads.current.get(queueId);
    if (pending?.phase === "uploaded") {
      await resumeFinalization(queueId);
      return;
    }
    if (pending) {
      if (!beginBusy()) return;
      let abandoned = false;
      try {
        abandoned = await abandonPendingUpload(queueId);
        if (!abandoned) {
          updateQueue(kind, queueId, { status: "error", error: "ABANDON_FAILED" });
        }
      } finally {
        endBusy();
      }
      if (!abandoned) return;
    }
    releaseQueuePreview(queueId);
    (kind === "image" ? setImageQueue : setDocumentQueue)((current) => current.filter((item) => item.id !== queueId));
    await runUpload(kind, [file]);
  }

  async function removeQueueItem(
    queueId: string,
    setter: typeof setImageQueue,
  ) {
    if (!beginBusy()) return;
    try {
      if (!(await abandonPendingUpload(queueId))) {
        const pending = pendingUploads.current.get(queueId);
        if (pending) updateQueue(pending.kind, queueId, { status: "error", error: "ABANDON_FAILED" });
        setAnnouncement(labels.media.errors.ABANDON_FAILED);
        return;
      }
      releaseQueuePreview(queueId);
      setter((current) => current.filter((item) => item.id !== queueId));
    } finally {
      endBusy();
    }
  }

  const localeStatus = useMemo(() => Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, media.length > 0 && media.every((item) => item.translations[contentLocale].trim())])) as Record<CatalogLocale, boolean>, [media]);

  async function saveImages() {
    if (!productId) return;
    const invalidLegacy = media.find((item) => item.source === "legacy" && !item.reference?.trim());
    if (invalidLegacy) {
      setAnnouncement(labels.media.errors.INVALID_INPUT);
      requestAnimationFrame(() => document.getElementById(`product-media-reference-${invalidLegacy.clientId}`)?.focus());
      return;
    }
    if (productStatus === "published") {
      for (const contentLocale of catalogLocales) {
        const invalidAlt = media.find((item) => !item.translations[contentLocale].trim());
        if (invalidAlt) {
          setActiveLocale(contentLocale);
          setAnnouncement(labels.media.errors.INVALID_INPUT);
          requestAnimationFrame(() => document.getElementById(`product-media-alt-${invalidAlt.clientId}`)?.focus());
          return;
        }
      }
    }
    setImageSavePending(true);
    setImageSaved(false);
    try {
      const result = await saveCatalogProductImagesAction({ locale, productId, expectedAssetsUpdatedAt: assetsUpdatedAt, images: media.map((item) => ({ id: item.clientId, reference: item.reference, isPrimary: item.isPrimary, isSocialImage: item.isSocialImage, translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: item.translations[contentLocale] })) })) });
      if (result.status === "success") { syncProductSection(result.data, "image", "persisted"); clearDirty("media"); setImageSaved(true); setAnnouncement(labels.media.saved); }
      else {
        if (result.code === "STALE") setReconciliationRequired(true);
        setAnnouncement(labels.media.errors[result.code] ?? result.code);
      }
    } catch {
      setAnnouncement(labels.media.errors.NETWORK_ERROR);
    } finally {
      setImageSavePending(false);
    }
  }

  async function saveDocuments() {
    if (!productId) return;
    for (const contentLocale of catalogLocales) {
      const invalid = documents.find((item) => !item.translations[contentLocale].title.trim());
      if (invalid) {
        setActiveLocale(contentLocale);
        setAnnouncement(labels.media.errors.INVALID_INPUT);
        requestAnimationFrame(() => document.getElementById(`product-document-title-${invalid.clientId}`)?.focus());
        return;
      }
    }
    setDocumentSavePending(true);
    setDocumentsSaved(false);
    try {
      const result = await saveCatalogProductDocumentsAction({ locale, productId, expectedAssetsUpdatedAt: assetsUpdatedAt, documents: documents.map((document) => ({ id: document.clientId, translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, title: document.translations[contentLocale].title, description: document.translations[contentLocale].description || null })) })) });
      if (result.status === "success") { syncProductSection(result.data, "document", "persisted"); clearDirty("documents"); setDocumentsSaved(true); setAnnouncement(labels.media.saved); }
      else {
        if (result.code === "STALE") setReconciliationRequired(true);
        setAnnouncement(labels.media.errors[result.code] ?? result.code);
      }
    } catch {
      setAnnouncement(labels.media.errors.NETWORK_ERROR);
    } finally {
      setDocumentSavePending(false);
    }
  }

  async function reconcileAssets(): Promise<ManagedCatalogProductAssetSlice | null> {
    if (!productId) return null;
    let result: Awaited<ReturnType<typeof getCatalogProductAssetsAction>>;
    try {
      result = await getCatalogProductAssetsAction({ productId });
    } catch {
      setAnnouncement(labels.media.errors.NETWORK_ERROR);
      return null;
    }
    if (result.status === "error") {
      setAnnouncement(labels.media.errors[result.code] ?? result.code);
      return null;
    }
    const next = draftSlice(result.data);
    const imageConflict = props.isMediaDirty &&
      !sameDraftSection(serverBaseline.current.images, next.images);
    const documentConflict = props.isDocumentsDirty &&
      !sameDraftSection(serverBaseline.current.documents, next.documents);
    if (imageConflict && !window.confirm(labels.media.discardChangesConfirm)) {
      setAnnouncement(labels.media.reconciliationCanceled);
      return null;
    }
    if (documentConflict && !window.confirm(labels.documents.discardChangesConfirm)) {
      setAnnouncement(labels.media.reconciliationCanceled);
      return null;
    }
    if (!props.isMediaDirty || imageConflict) setMedia(next.images);
    if (!props.isDocumentsDirty || documentConflict) setDocuments(next.documents);
    if (imageConflict) clearDirty("media");
    if (documentConflict) clearDirty("documents");
    serverBaseline.current = next;
    setAssetsUpdatedAt(result.data.assetsUpdatedAt);
    setReconciliationRequired(false);
    setAnnouncement(labels.media.reconciled);
    return result.data;
  }

  async function reconcileWithBusy() {
    if (!beginBusy()) return;
    try {
      await reconcileAssets();
    } finally {
      endBusy();
    }
  }

  return <>
    {announcement ? <p className="dashboard-catalog-media-feedback" role="status" aria-live="polite" aria-atomic="true">{announcement}</p> : null}
    {reconciliationRequired ? <div className="dashboard-catalog-media-alert" role="alert"><p>{labels.media.statuses.reconciliation}</p><DashboardButton type="button" disabled={busy} onClick={() => void reconcileWithBusy()}>{labels.actions.reload}</DashboardButton></div> : null}
    <details className="dashboard-catalog-section dashboard-catalog-media-section" data-unsaved={props.isMediaDirty || undefined}>
      <summary>{labels.sections.media}{props.isMediaDirty ? <span className="dashboard-catalog-section-unsaved">{labels.saveState.unsavedLabel}</span> : null}</summary>
      <div className="dashboard-catalog-media-body">
        <LocalizedEditorSwitch idPrefix="product-media" variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={localeStatus} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.media.languageLabel} />
        <fieldset disabled={editorDisabled || !productId || imageSavePending} aria-busy={imageSavePending} className="dashboard-catalog-product-fieldset dashboard-catalog-media-workspace">
          <div className="dashboard-catalog-upload-panel">
            <div className="dashboard-catalog-upload-copy">
              <label htmlFor="catalog-product-image-upload">{labels.media.select}</label>
              <p id="catalog-product-image-upload-help">{labels.media.upload}</p>
            </div>
            <input ref={imageInputRef} id="catalog-product-image-upload" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple disabled={busy} aria-describedby="catalog-product-image-upload-help" onChange={(event) => { void runUpload("image", Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          </div>
          <Queue items={imageQueue} labels={labels} locale={locale} controllers={controllers} onRetry={(id, file) => void retryQueueItem(id, file, "image")} onResume={(id) => pendingUploads.current.has(id) ? void resumeFinalization(id) : void reconcileWithBusy()} onRemove={(id) => void removeQueueItem(id, setImageQueue)} />
          {media.length === 0 ? <p className="dashboard-catalog-media-empty">{labels.media.empty}</p> : <div className="dashboard-catalog-media-list">{media.map((item, index) => <ImageItem key={item.clientId} item={item} index={index} props={props} activeLocale={activeLocale} syncProductSection={syncProductSection} inputRef={imageInputRef} setAnnouncement={setAnnouncement} onStale={() => setReconciliationRequired(true)} />)}</div>}
          {media.length ? <><CatalogSectionSaveState id="catalog-product-media-save-state" isDirty={props.isMediaDirty} pending={imageSavePending} result={{ status: imageSaved ? "success" : "idle" }} copy={labels.saveState} /><div className="dashboard-catalog-media-save"><DashboardButton type="button" variant="primary" disabled={!props.isMediaDirty || imageSavePending || busy} aria-describedby="catalog-product-media-save-state" onClick={() => void saveImages()}>{imageSavePending ? labels.actions.saving : labels.media.save}</DashboardButton></div></> : null}
        </fieldset>
      </div>
    </details>
    <details className="dashboard-catalog-section dashboard-catalog-media-section" data-unsaved={props.isDocumentsDirty || undefined}>
      <summary>{labels.sections.documents}{props.isDocumentsDirty ? <span className="dashboard-catalog-section-unsaved">{labels.saveState.unsavedLabel}</span> : null}</summary>
      <div className="dashboard-catalog-media-body">
        <LocalizedEditorSwitch idPrefix="product-documents" variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, documents.every((item) => item.translations[contentLocale].title.trim())])) as Record<CatalogLocale, boolean>} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.documents.languageLabel} />
        <fieldset disabled={editorDisabled || !productId || documentSavePending} aria-busy={documentSavePending} className="dashboard-catalog-product-fieldset dashboard-catalog-media-workspace">
          <div className="dashboard-catalog-upload-panel">
            <div className="dashboard-catalog-upload-copy">
              <label htmlFor="catalog-product-document-upload">{labels.documents.select}</label>
              <p id="catalog-product-document-upload-help">{labels.documents.upload}</p>
            </div>
            <input ref={documentInputRef} id="catalog-product-document-upload" type="file" accept="application/pdf,.pdf" multiple disabled={busy} aria-describedby="catalog-product-document-upload-help" onChange={(event) => { void runUpload("document", Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          </div>
          <Queue items={documentQueue} labels={labels} locale={locale} controllers={controllers} onRetry={(id, file) => void retryQueueItem(id, file, "document")} onResume={(id) => pendingUploads.current.has(id) ? void resumeFinalization(id) : void reconcileWithBusy()} onRemove={(id) => void removeQueueItem(id, setDocumentQueue)} />
          {documents.length === 0 ? <p className="dashboard-catalog-media-empty">{labels.documents.empty}</p> : <div className="dashboard-catalog-media-list">{documents.map((document, index) => <DocumentItem key={document.clientId} document={document} index={index} props={props} activeLocale={activeLocale} syncProductSection={syncProductSection} inputRef={documentInputRef} setAnnouncement={setAnnouncement} onStale={() => setReconciliationRequired(true)} />)}</div>}
          {documents.length ? <><CatalogSectionSaveState id="catalog-product-documents-save-state" isDirty={props.isDocumentsDirty} pending={documentSavePending} result={{ status: documentsSaved ? "success" : "idle" }} copy={labels.saveState} /><div className="dashboard-catalog-media-save"><DashboardButton type="button" variant="primary" disabled={!props.isDocumentsDirty || documentSavePending || busy} aria-describedby="catalog-product-documents-save-state" onClick={() => void saveDocuments()}>{documentSavePending ? labels.actions.saving : labels.documents.save}</DashboardButton></div></> : null}
        </fieldset>
      </div>
    </details>
  </>;
}

function Queue({ items, labels, locale, controllers, onRetry, onResume, onRemove }: { items: QueueItem[]; labels: ProductMediaSectionProps["labels"]; locale: string; controllers: RefObject<Map<string, AbortController>>; onRetry: (id: string, file: File) => void; onResume: (id: string) => void; onRemove: (id: string) => void }) {
  if (!items.length) return null;
  const successful = items.filter((item) => item.status === "success").length;
  return <div className="dashboard-catalog-upload-queue" aria-label={labels.media.upload} aria-live="polite">
    <p className="dashboard-catalog-upload-summary" role="status"><strong>{successful}/{items.length}</strong><span>{labels.media.statuses.success}</span></p>
    <div className="dashboard-catalog-upload-list">
      {items.map((item) => <article key={item.id} className={`dashboard-catalog-upload-item${item.previewUrl ? " dashboard-catalog-upload-item--preview" : ""}`} data-status={item.status}>
        {item.previewUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={item.previewUrl} alt="" className="dashboard-catalog-upload-preview" /></> : null}
        <div className="dashboard-catalog-upload-item-content">
          <div className="dashboard-catalog-upload-item-heading"><strong>{item.file.name}</strong><span className="dashboard-catalog-media-badge" data-status={item.status}>{labels.media.statuses[item.status]}{item.status === "uploading" ? ` ${item.progress}%` : ""}</span></div>
          <p className="dashboard-catalog-media-meta">{labels.media.originalSize}: {formatCatalogBytes(item.originalSize, locale)}{item.uploadSize !== null ? ` · ${labels.media.uploadSize}: ${formatCatalogBytes(item.uploadSize, locale)}` : ""}</p>
          {item.status === "uploading" ? <progress max="100" value={item.progress} aria-label={`${item.file.name}: ${labels.media.statuses.uploading}`} /> : null}
          {item.error ? <p className="dashboard-catalog-media-error" role="alert">{labels.media.errors[item.error] ?? item.error}</p> : null}
          <div className="dashboard-catalog-item-controls dashboard-catalog-media-actions">
            {item.status === "uploading" ? <DashboardButton type="button" onClick={() => controllers.current?.get(item.id)?.abort()}>{labels.media.cancel}</DashboardButton> : null}
            {item.status === "error" || item.status === "canceled" ? <DashboardButton type="button" onClick={() => onRetry(item.id, item.file)}>{labels.media.retry}</DashboardButton> : null}
            {item.status === "reconciliation" ? <DashboardButton type="button" onClick={() => onResume(item.id)}>{labels.media.retry}</DashboardButton> : null}
            {item.status !== "uploading" && item.status !== "finalizing" ? <DashboardButton type="button" onClick={() => onRemove(item.id)}>{labels.media.remove}</DashboardButton> : null}
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}

function ImageItem({ item, index, props, activeLocale, syncProductSection, inputRef, setAnnouncement, onStale }: { item: MediaDraft; index: number; props: ProductMediaSectionProps; activeLocale: CatalogLocale; syncProductSection: SyncProductSection; inputRef: RefObject<HTMLInputElement | null>; setAnnouncement: (value: string) => void; onStale: () => void }) {
  const { labels, media, setMedia, markDirty, locale, productId, assetsUpdatedAt } = props;
  return <section className="dashboard-catalog-media-item dashboard-catalog-image-item" aria-label={`${labels.sections.media} ${index + 1}`}>
    <div className="dashboard-catalog-media-preview-column">
      {/* Administrator previews may include legacy hosts that cannot be configured for next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="dashboard-catalog-media-preview" />
      {item.byteSize || (item.width && item.height) ? <p className="dashboard-catalog-media-meta">{item.width && item.height ? `${item.width} × ${item.height}` : null}{item.byteSize ? `${item.width && item.height ? " · " : ""}${formatCatalogBytes(item.byteSize, locale)}` : null}</p> : null}
    </div>
    <div className="dashboard-catalog-media-item-content">
      <header className="dashboard-catalog-media-item-heading">
        <div><span className="dashboard-catalog-media-badge">{item.source === "legacy" ? labels.media.legacy : labels.media.managed}</span><strong>{item.originalFilename ?? (item.source === "legacy" ? labels.media.legacy : labels.media.managed)}</strong></div>
        <span className="dashboard-catalog-media-position" aria-hidden="true">{index + 1}</span>
      </header>
      {item.source === "legacy" ? <Field id={`product-media-reference-${item.clientId}`} copy={labels.fields.mediaReference}><input id={`product-media-reference-${item.clientId}`} aria-describedby={`product-media-reference-${item.clientId}-help`} value={item.reference ?? ""} onChange={(event) => { setMedia((current) => current.map((candidate) => candidate.clientId === item.clientId ? { ...candidate, reference: event.target.value, url: event.target.value } : candidate)); markDirty("media"); }} /></Field> : null}
      <Field id={`product-media-alt-${item.clientId}`} copy={labels.fields.altText}><input id={`product-media-alt-${item.clientId}`} aria-describedby={`product-media-alt-${item.clientId}-help`} value={item.translations[activeLocale]} onChange={(event) => { setMedia((current) => current.map((candidate) => candidate.clientId === item.clientId ? { ...candidate, translations: { ...candidate.translations, [activeLocale]: event.target.value } } : candidate)); markDirty("media"); }} /></Field>
      <div className="dashboard-catalog-media-flags">
        <label><input type="radio" name="primaryMedia" checked={item.isPrimary} onChange={() => { setMedia((current) => current.map((candidate) => ({ ...candidate, isPrimary: candidate.clientId === item.clientId }))); markDirty("media"); }} /> {labels.media.primary}</label>
        <label><input type="checkbox" checked={item.isSocialImage} onChange={(event) => { setMedia((current) => current.map((candidate) => ({ ...candidate, isSocialImage: candidate.clientId === item.clientId ? event.target.checked : false }))); markDirty("media"); }} /> {labels.media.social}</label>
      </div>
      <div className="dashboard-catalog-item-controls dashboard-catalog-media-actions">
        <DashboardButton type="button" disabled={index === 0} onClick={() => { setMedia((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); markDirty("media"); }}>{labels.media.moveUp}</DashboardButton>
        <DashboardButton type="button" disabled={index === media.length - 1} onClick={() => { setMedia((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; }); markDirty("media"); }}>{labels.media.moveDown}</DashboardButton>
        <DashboardButton type="button" tone="danger" onClick={async () => { if (!window.confirm(item.source === "legacy" ? labels.media.removeLegacyConfirm : labels.media.deleteConfirm) || !productId) return; try { const result = await deleteCatalogProductImageAction({ locale, productId, mediaId: item.clientId, expectedAssetsUpdatedAt: assetsUpdatedAt }); if (result.status === "success") { syncProductSection(result.data, "image", "deleted", item.clientId); if (result.data.cleanupPending) setAnnouncement(labels.media.cleanupPending); requestAnimationFrame(() => inputRef.current?.focus()); } else { if (result.code === "STALE") onStale(); setAnnouncement(labels.media.errors[result.code] ?? result.code); } } catch { setAnnouncement(labels.media.errors.NETWORK_ERROR); } }}>{labels.media.remove}</DashboardButton>
      </div>
    </div>
  </section>;
}

function DocumentItem({ document, index, props, activeLocale, syncProductSection, inputRef, setAnnouncement, onStale }: { document: DocumentDraft; index: number; props: ProductMediaSectionProps; activeLocale: CatalogLocale; syncProductSection: SyncProductSection; inputRef: RefObject<HTMLInputElement | null>; setAnnouncement: (value: string) => void; onStale: () => void }) {
  const { labels, documents, setDocuments, markDirty, locale, productId, assetsUpdatedAt } = props;
  return <section className="dashboard-catalog-media-item dashboard-catalog-document-item" aria-label={`${labels.sections.documents} ${index + 1}`}>
    <div className="dashboard-catalog-document-mark" aria-hidden="true">{labels.documents.pdf}</div>
    <div className="dashboard-catalog-media-item-content">
      <header className="dashboard-catalog-media-item-heading">
        <div><strong>{document.originalFilename}</strong><span className="dashboard-catalog-media-meta">{labels.documents.pdf} · {formatCatalogBytes(document.byteSize, locale)}</span></div>
        <span className="dashboard-catalog-media-position" aria-hidden="true">{index + 1}</span>
      </header>
      <Field id={`product-document-title-${document.clientId}`} copy={{ label: labels.documents.title, help: "" }}><input id={`product-document-title-${document.clientId}`} aria-describedby={`product-document-title-${document.clientId}-help`} value={document.translations[activeLocale].title} onChange={(event) => { setDocuments((current) => current.map((candidate) => candidate.clientId === document.clientId ? { ...candidate, translations: { ...candidate.translations, [activeLocale]: { ...candidate.translations[activeLocale], title: event.target.value } } } : candidate)); markDirty("documents"); }} /></Field>
      <Field id={`product-document-description-${document.clientId}`} copy={{ label: labels.documents.description, help: "" }}><textarea id={`product-document-description-${document.clientId}`} aria-describedby={`product-document-description-${document.clientId}-help`} value={document.translations[activeLocale].description} onChange={(event) => { setDocuments((current) => current.map((candidate) => candidate.clientId === document.clientId ? { ...candidate, translations: { ...candidate.translations, [activeLocale]: { ...candidate.translations[activeLocale], description: event.target.value } } } : candidate)); markDirty("documents"); }} /></Field>
      <div className="dashboard-catalog-item-controls dashboard-catalog-media-actions">
        <DashboardButton type="button" disabled={index === 0} onClick={() => { setDocuments((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); markDirty("documents"); }}>{labels.documents.moveUp}</DashboardButton>
        <DashboardButton type="button" disabled={index === documents.length - 1} onClick={() => { setDocuments((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; }); markDirty("documents"); }}>{labels.documents.moveDown}</DashboardButton>
        <DashboardButton type="button" tone="danger" onClick={async () => { if (!window.confirm(labels.documents.deleteConfirm) || !productId) return; try { const result = await deleteCatalogProductDocumentAction({ locale, productId, documentId: document.clientId, expectedAssetsUpdatedAt: assetsUpdatedAt }); if (result.status === "success") { syncProductSection(result.data, "document", "deleted", document.clientId); if (result.data.cleanupPending) setAnnouncement(labels.media.cleanupPending); requestAnimationFrame(() => inputRef.current?.focus()); } else { if (result.code === "STALE") onStale(); setAnnouncement(labels.media.errors[result.code] ?? result.code); } } catch { setAnnouncement(labels.media.errors.NETWORK_ERROR); } }}>{labels.documents.remove}</DashboardButton>
      </div>
    </div>
  </section>;
}
