"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogDocument, ManagedCatalogImage } from "@/lib/catalog/management-asset-types";
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
import type { DocumentDraft, MediaDraft } from "./product-editor-model";
import {
  filenameStem,
  formatCatalogBytes,
  prepareCatalogImage,
  prepareCatalogPdf,
  type PreparedCatalogFile,
  uploadCatalogFile,
} from "./catalog-upload-client";
import type { ProductMediaSectionProps } from "./product-media-model";

type UploadStatus = "queued" | "optimizing" | "uploading" | "awaiting" | "finalizing" | "success" | "canceled" | "reconciliation" | "error";
type QueueItem = { id: string; file: File; status: UploadStatus; progress: number; originalSize: number; uploadSize: number | null; previewUrl?: string; error?: string };

function mediaDrafts(images: ManagedCatalogImage[]): MediaDraft[] {
  return images.map((item) => ({
    clientId: item.id,
    source: item.source,
    reference: item.reference,
    url: item.url,
    originalFilename: item.originalFilename,
    byteSize: item.byteSize,
    width: item.width,
    height: item.height,
    isPrimary: item.isPrimary,
    isSocialImage: item.isSocialImage,
    translations: Object.fromEntries(catalogLocales.map((locale) => [locale, item.translations.find((translation) => translation.locale === locale)?.altText ?? ""])) as Record<CatalogLocale, string>,
  }));
}

function documentDrafts(documents: ManagedCatalogDocument[]): DocumentDraft[] {
  return documents.map((item) => ({
    clientId: item.id,
    url: item.url,
    originalFilename: item.originalFilename,
    byteSize: item.byteSize,
    translations: Object.fromEntries(catalogLocales.map((locale) => {
      const translation = item.translations.find((candidate) => candidate.locale === locale);
      return [locale, { title: translation?.title ?? "", description: translation?.description ?? "" }];
    })) as DocumentDraft["translations"],
  }));
}

export function ProductMediaSection(props: ProductMediaSectionProps) {
  const { labels, languages, editorDisabled, clearDirty, activeLocale, setActiveLocale, media, setMedia, documents, setDocuments, assetsUpdatedAt, setAssetsUpdatedAt, productId, productStatus, locale } = props;
  const [imageQueue, setImageQueue] = useState<QueueItem[]>([]);
  const [documentQueue, setDocumentQueue] = useState<QueueItem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconciliationRequired, setReconciliationRequired] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());
  const pendingFinalizations = useRef(new Map<string, { uploadId: string; kind: "image" | "document"; defaultText: string }>());
  const previewByQueueId = useRef(new Map<string, string>());
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

  const updateQueue = (kind: "image" | "document", id: string, patch: Partial<QueueItem>) => {
    const setter = kind === "image" ? setImageQueue : setDocumentQueue;
    setter((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };
  const applyProductSlice = (data: { assetsUpdatedAt: string; images: ManagedCatalogImage[]; documents: ManagedCatalogDocument[] }) => {
    setAssetsUpdatedAt(data.assetsUpdatedAt);
    setMedia(mediaDrafts(data.images));
    setDocuments(documentDrafts(data.documents));
  };

  async function prepareFiles(kind: "image" | "document", files: File[]) {
    const prepared: Array<{ queueId: string; prepared: PreparedCatalogFile }> = [];
    for (const file of files) {
      const queueId = crypto.randomUUID();
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
    if (!productId || files.length === 0) return;
    setBusy(true);
    const prepared = await prepareFiles(kind, files);
    if (prepared.length === 0) { setBusy(false); return; }
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
      setBusy(false);
      return;
    }
    let nextIndex = 0;
    const uploaded = new Set<string>();
    await Promise.all(Array.from({ length: Math.min(3, prepared.length) }, async () => {
      while (nextIndex < prepared.length) {
        const index = nextIndex++;
        const item = prepared[index];
        const controller = new AbortController();
        controllers.current.set(item.queueId, controller);
        updateQueue(kind, item.queueId, { status: "uploading", progress: 0 });
        try {
          await uploadCatalogFile(authorization.data[index], item.prepared.upload, controller.signal, (progress) => updateQueue(kind, item.queueId, { progress }));
          uploaded.add(item.queueId);
          pendingFinalizations.current.set(item.queueId, { uploadId: authorization.data[index].uploadId, kind, defaultText: filenameStem(item.prepared.original.name) });
          updateQueue(kind, item.queueId, { status: "awaiting", progress: 100 });
        } catch (error) {
          await abandonCatalogUploadAction({ uploadId: authorization.data[index].uploadId });
          updateQueue(kind, item.queueId, { status: controller.signal.aborted ? "canceled" : "error", error: error instanceof Error ? error.message : "UPLOAD_FAILED" });
        } finally { controllers.current.delete(item.queueId); }
      }
    }));

    let revision = assetsUpdatedAt;
    for (const [index, item] of prepared.entries()) {
      if (!uploaded.has(item.queueId)) continue;
      updateQueue(kind, item.queueId, { status: "finalizing", progress: 100 });
      const defaultText = filenameStem(item.prepared.original.name);
      const result = await finalizeCatalogUploadAction({
        locale,
        uploadId: authorization.data[index].uploadId,
        targetId: productId,
        expectedAssetsUpdatedAt: revision,
        altTranslations: kind === "image" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: productStatus === "published" ? defaultText : "" })) : undefined,
        documentTranslations: kind === "document" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, title: defaultText, description: null })) : undefined,
      });
      if (result.status === "error") {
        if (result.code === "INVALID_INPUT" || result.code === "UPLOAD_EXPIRED") {
          await abandonCatalogUploadAction({ uploadId: authorization.data[index].uploadId });
          pendingFinalizations.current.delete(item.queueId);
        }
        updateQueue(kind, item.queueId, { status: result.code === "STALE" ? "reconciliation" : "error", error: result.code });
        if (result.code === "STALE") {
          for (const remaining of prepared.slice(index + 1)) if (uploaded.has(remaining.queueId)) updateQueue(kind, remaining.queueId, { status: "reconciliation", error: "STALE" });
          setAnnouncement(labels.media.statuses.reconciliation);
          setReconciliationRequired(true);
          break;
        }
        continue;
      }
      if ("images" in result.data) { applyProductSlice(result.data); revision = result.data.assetsUpdatedAt; }
      pendingFinalizations.current.delete(item.queueId);
      const previewUrl = previewByQueueId.current.get(item.queueId);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewByQueueId.current.delete(item.queueId); }
      updateQueue(kind, item.queueId, { status: "success", previewUrl: undefined });
      setAnnouncement(labels.media.statuses.success);
    }
    setBusy(false);
  }

  async function resumeFinalization(queueId: string) {
    if (!productId) return;
    const pending = pendingFinalizations.current.get(queueId);
    if (!pending) return;
    const current = await getCatalogProductAssetsAction({ productId });
    if (current.status === "error") { setAnnouncement(labels.media.errors[current.code] ?? current.code); return; }
    applyProductSlice(current.data);
    setReconciliationRequired(false);
    updateQueue(pending.kind, queueId, { status: "finalizing", error: undefined });
    const result = await finalizeCatalogUploadAction({
      locale,
      uploadId: pending.uploadId,
      targetId: productId,
      expectedAssetsUpdatedAt: current.data.assetsUpdatedAt,
      altTranslations: pending.kind === "image" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: productStatus === "published" ? pending.defaultText : "" })) : undefined,
      documentTranslations: pending.kind === "document" ? catalogLocales.map((contentLocale) => ({ locale: contentLocale, title: pending.defaultText, description: null })) : undefined,
    });
    if (result.status === "error") {
      if (result.code === "INVALID_INPUT" || result.code === "UPLOAD_EXPIRED") {
        await abandonCatalogUploadAction({ uploadId: pending.uploadId });
        pendingFinalizations.current.delete(queueId);
      }
      updateQueue(pending.kind, queueId, { status: result.code === "STALE" ? "reconciliation" : "error", error: result.code });
      return;
    }
    if ("images" in result.data) applyProductSlice(result.data);
    pendingFinalizations.current.delete(queueId);
    const previewUrl = previewByQueueId.current.get(queueId);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewByQueueId.current.delete(queueId); }
    updateQueue(pending.kind, queueId, { status: "success", previewUrl: undefined, error: undefined });
  }

  async function removeQueueItem(
    queueId: string,
    setter: typeof setImageQueue,
  ) {
    const pending = pendingFinalizations.current.get(queueId);
    if (pending) {
      await abandonCatalogUploadAction({ uploadId: pending.uploadId });
      pendingFinalizations.current.delete(queueId);
    }
    const previewUrl = previewByQueueId.current.get(queueId);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewByQueueId.current.delete(queueId); }
    setter((current) => current.filter((item) => item.id !== queueId));
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
    const result = await saveCatalogProductImagesAction({ locale, productId, expectedAssetsUpdatedAt: assetsUpdatedAt, images: media.map((item) => ({ id: item.clientId, reference: item.reference, isPrimary: item.isPrimary, isSocialImage: item.isSocialImage, translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: item.translations[contentLocale] })) })) });
    if (result.status === "success") { applyProductSlice(result.data); clearDirty("media"); setAnnouncement(labels.media.saved); }
    else {
      if (result.code === "STALE") setReconciliationRequired(true);
      setAnnouncement(labels.media.errors[result.code] ?? result.code);
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
    const result = await saveCatalogProductDocumentsAction({ locale, productId, expectedAssetsUpdatedAt: assetsUpdatedAt, documents: documents.map((document) => ({ id: document.clientId, translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, title: document.translations[contentLocale].title, description: document.translations[contentLocale].description || null })) })) });
    if (result.status === "success") { applyProductSlice(result.data); clearDirty("documents"); setAnnouncement(labels.media.saved); }
    else {
      if (result.code === "STALE") setReconciliationRequired(true);
      setAnnouncement(labels.media.errors[result.code] ?? result.code);
    }
  }

  async function reconcileAssets() {
    if (!productId) return;
    const result = await getCatalogProductAssetsAction({ productId });
    if (result.status === "error") {
      setAnnouncement(labels.media.errors[result.code] ?? result.code);
      return;
    }
    applyProductSlice(result.data);
    clearDirty("media");
    clearDirty("documents");
    setReconciliationRequired(false);
  }

  return <>
    {announcement ? <p className="dashboard-catalog-media-feedback" role="status" aria-live="polite" aria-atomic="true">{announcement}</p> : null}
    {reconciliationRequired ? <div className="dashboard-catalog-media-alert" role="alert"><p>{labels.media.statuses.reconciliation}</p><DashboardButton type="button" onClick={() => void reconcileAssets()}>{labels.actions.reload}</DashboardButton></div> : null}
    <details className="dashboard-catalog-section dashboard-catalog-media-section">
      <summary>{labels.sections.media}</summary>
      <div className="dashboard-catalog-media-body">
        <LocalizedEditorSwitch idPrefix="product-media" variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={localeStatus} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.media.languageLabel} />
        <fieldset disabled={editorDisabled || !productId} className="dashboard-catalog-product-fieldset dashboard-catalog-media-workspace">
          <div className="dashboard-catalog-upload-panel">
            <div className="dashboard-catalog-upload-copy">
              <label htmlFor="catalog-product-image-upload">{labels.media.select}</label>
              <p id="catalog-product-image-upload-help">{labels.media.upload}</p>
            </div>
            <input ref={imageInputRef} id="catalog-product-image-upload" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple disabled={busy} aria-describedby="catalog-product-image-upload-help" onChange={(event) => { void runUpload("image", Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          </div>
          <Queue items={imageQueue} labels={labels} locale={locale} controllers={controllers} onRetry={(id, file) => pendingFinalizations.current.has(id) ? void resumeFinalization(id) : void runUpload("image", [file])} onResume={(id) => void resumeFinalization(id)} onRemove={(id) => void removeQueueItem(id, setImageQueue)} />
          {media.length === 0 ? <p className="dashboard-catalog-media-empty">{labels.media.empty}</p> : <div className="dashboard-catalog-media-list">{media.map((item, index) => <ImageItem key={item.clientId} item={item} index={index} props={props} activeLocale={activeLocale} applyProductSlice={applyProductSlice} inputRef={imageInputRef} setAnnouncement={setAnnouncement} onStale={() => setReconciliationRequired(true)} />)}</div>}
          {media.length ? <div className="dashboard-catalog-media-save"><DashboardButton type="button" variant="primary" onClick={() => void saveImages()}>{labels.media.save}</DashboardButton></div> : null}
        </fieldset>
      </div>
    </details>
    <details className="dashboard-catalog-section dashboard-catalog-media-section">
      <summary>{labels.sections.documents}</summary>
      <div className="dashboard-catalog-media-body">
        <LocalizedEditorSwitch idPrefix="product-documents" variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, documents.every((item) => item.translations[contentLocale].title.trim())])) as Record<CatalogLocale, boolean>} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.documents.languageLabel} />
        <fieldset disabled={editorDisabled || !productId} className="dashboard-catalog-product-fieldset dashboard-catalog-media-workspace">
          <div className="dashboard-catalog-upload-panel">
            <div className="dashboard-catalog-upload-copy">
              <label htmlFor="catalog-product-document-upload">{labels.documents.select}</label>
              <p id="catalog-product-document-upload-help">{labels.documents.upload}</p>
            </div>
            <input ref={documentInputRef} id="catalog-product-document-upload" type="file" accept="application/pdf,.pdf" multiple disabled={busy} aria-describedby="catalog-product-document-upload-help" onChange={(event) => { void runUpload("document", Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          </div>
          <Queue items={documentQueue} labels={labels} locale={locale} controllers={controllers} onRetry={(id, file) => pendingFinalizations.current.has(id) ? void resumeFinalization(id) : void runUpload("document", [file])} onResume={(id) => void resumeFinalization(id)} onRemove={(id) => void removeQueueItem(id, setDocumentQueue)} />
          {documents.length === 0 ? <p className="dashboard-catalog-media-empty">{labels.documents.empty}</p> : <div className="dashboard-catalog-media-list">{documents.map((document, index) => <DocumentItem key={document.clientId} document={document} index={index} props={props} activeLocale={activeLocale} applyProductSlice={applyProductSlice} inputRef={documentInputRef} setAnnouncement={setAnnouncement} onStale={() => setReconciliationRequired(true)} />)}</div>}
          {documents.length ? <div className="dashboard-catalog-media-save"><DashboardButton type="button" variant="primary" onClick={() => void saveDocuments()}>{labels.documents.save}</DashboardButton></div> : null}
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

function ImageItem({ item, index, props, activeLocale, applyProductSlice, inputRef, setAnnouncement, onStale }: { item: MediaDraft; index: number; props: ProductMediaSectionProps; activeLocale: CatalogLocale; applyProductSlice: (data: { assetsUpdatedAt: string; images: ManagedCatalogImage[]; documents: ManagedCatalogDocument[] }) => void; inputRef: RefObject<HTMLInputElement | null>; setAnnouncement: (value: string) => void; onStale: () => void }) {
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
        <DashboardButton type="button" tone="danger" onClick={async () => { if (!window.confirm(item.source === "legacy" ? labels.media.removeLegacyConfirm : labels.media.deleteConfirm) || !productId) return; const result = await deleteCatalogProductImageAction({ locale, productId, mediaId: item.clientId, expectedAssetsUpdatedAt: assetsUpdatedAt }); if (result.status === "success") { applyProductSlice(result.data); if (result.data.cleanupPending) setAnnouncement(labels.media.cleanupPending); requestAnimationFrame(() => inputRef.current?.focus()); } else { if (result.code === "STALE") onStale(); setAnnouncement(labels.media.errors[result.code] ?? result.code); } }}>{labels.media.remove}</DashboardButton>
      </div>
    </div>
  </section>;
}

function DocumentItem({ document, index, props, activeLocale, applyProductSlice, inputRef, setAnnouncement, onStale }: { document: DocumentDraft; index: number; props: ProductMediaSectionProps; activeLocale: CatalogLocale; applyProductSlice: (data: { assetsUpdatedAt: string; images: ManagedCatalogImage[]; documents: ManagedCatalogDocument[] }) => void; inputRef: RefObject<HTMLInputElement | null>; setAnnouncement: (value: string) => void; onStale: () => void }) {
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
        <DashboardButton type="button" tone="danger" onClick={async () => { if (!window.confirm(labels.documents.deleteConfirm) || !productId) return; const result = await deleteCatalogProductDocumentAction({ locale, productId, documentId: document.clientId, expectedAssetsUpdatedAt: assetsUpdatedAt }); if (result.status === "success") { applyProductSlice(result.data); if (result.data.cleanupPending) setAnnouncement(labels.media.cleanupPending); requestAnimationFrame(() => inputRef.current?.focus()); } else { if (result.code === "STALE") onStale(); setAnnouncement(labels.media.errors[result.code] ?? result.code); } }}>{labels.documents.remove}</DashboardButton>
      </div>
    </div>
  </section>;
}
