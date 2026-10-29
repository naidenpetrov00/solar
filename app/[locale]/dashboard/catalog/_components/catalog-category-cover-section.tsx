"use client";

import { useEffect, useRef, useState } from "react";
import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogCategoryDetail } from "@/lib/catalog/management-category-types";
import type { ManagedCatalogCover } from "@/lib/catalog/management-asset-types";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import {
  abandonCatalogUploadAction,
  authorizeCatalogUploadsAction,
  deleteCatalogCategoryCoverAction,
  finalizeCatalogUploadAction,
  getCatalogCategoryAssetAction,
  saveCatalogCategoryCoverAltAction,
} from "../catalog-asset-actions";
import { DashboardButton } from "./product-editor-draft";
import { filenameStem, formatCatalogBytes, prepareCatalogImage, type PreparedCatalogFile, uploadCatalogFile } from "./catalog-upload-client";
import type { CatalogLabels } from "./catalog-labels";

function translationsFromCover(cover: ManagedCatalogCover | null) {
  return Object.fromEntries(catalogLocales.map((locale) => [locale, cover?.translations.find((translation) => translation.locale === locale)?.altText ?? ""])) as Record<CatalogLocale, string>;
}

export function CategoryCoverSection({ detail, labels, locale, canManage, isDirty, onDirty, clearDirty }: {
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
  locale: string;
  canManage: boolean;
  isDirty: boolean;
  onDirty: () => void;
  clearDirty: () => void;
}) {
  const [cover, setCover] = useState(detail.cover);
  const [revision, setRevision] = useState(detail.assetsUpdatedAt);
  const [translations, setTranslations] = useState(() => translationsFromCover(detail.cover));
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>("bg");
  const [prepared, setPrepared] = useState<PreparedCatalogFile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"optimizing" | "uploading" | "finalizing" | "success" | "error" | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const applySlice = (data: { assetsUpdatedAt: string; cover: ManagedCatalogCover | null }) => {
    setRevision(data.assetsUpdatedAt);
    setCover(data.cover);
    setTranslations(translationsFromCover(data.cover));
    setPrepared(null);
    setPreview(null);
    clearDirty();
  };

  async function reconcileRevision() {
    const latest = await getCatalogCategoryAssetAction({ categoryId: detail.id });
    if (latest.status === "error") return;
    setRevision(latest.data.assetsUpdatedAt);
    setCover(latest.data.cover);
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    if (pendingUploadId) {
      await abandonCatalogUploadAction({ uploadId: pendingUploadId });
      setPendingUploadId(null);
    }
    setStatus("optimizing");
    setError("");
    try {
      const next = await prepareCatalogImage(file);
      setPrepared(next);
      setPreview(URL.createObjectURL(next.upload));
      if (!cover) {
        const fallback = filenameStem(file.name);
        setTranslations(Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, fallback])) as Record<CatalogLocale, string>);
      }
      setStatus(null);
      onDirty();
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "INVALID_INPUT");
    }
  }

  async function upload() {
    const missingLocale = catalogLocales.find(
      (contentLocale) => !translations[contentLocale].trim(),
    );
    if (!prepared || missingLocale) {
      setStatus("error");
      setError("ALT_REQUIRED");
      if (missingLocale) setActiveLocale(missingLocale);
      requestAnimationFrame(() =>
        document
          .getElementById(`catalog-cover-alt-${missingLocale ?? activeLocale}`)
          ?.focus(),
      );
      return;
    }
    let uploadId = pendingUploadId;
    let currentRevision = revision;
    if (uploadId) {
      const latest = await getCatalogCategoryAssetAction({ categoryId: detail.id });
      if (latest.status === "error") { setStatus("error"); setError(latest.code); return; }
      setRevision(latest.data.assetsUpdatedAt);
      currentRevision = latest.data.assetsUpdatedAt;
    }
    const authorization = uploadId ? null : await authorizeCatalogUploadsAction({ locale, targetId: detail.id, expectedAssetsUpdatedAt: currentRevision, purpose: "category_cover", files: [{ originalFilename: prepared.original.name, uploadFilename: prepared.upload.name, mimeType: prepared.upload.type, byteSize: prepared.upload.size }] });
    if (authorization?.status === "error") {
      if (authorization.code === "STALE") await reconcileRevision();
      setStatus("error"); setError(authorization.code); return;
    }
    if (!uploadId && authorization?.status === "success") {
      uploadId = authorization.data[0].uploadId;
      setPendingUploadId(uploadId);
    }
    if (!uploadId) return;
    const controller = new AbortController();
    setStatus(authorization ? "uploading" : "finalizing");
    try {
      if (authorization?.status === "success") {
        await uploadCatalogFile(authorization.data[0], prepared.upload, controller.signal, setProgress);
      }
      setStatus("finalizing");
      const result = await finalizeCatalogUploadAction({ locale, uploadId, targetId: detail.id, expectedAssetsUpdatedAt: currentRevision, altTranslations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: translations[contentLocale] })) });
      if (result.status === "error") {
        if (result.code === "INVALID_INPUT" || result.code === "UPLOAD_EXPIRED") {
          await abandonCatalogUploadAction({ uploadId });
          setPendingUploadId(null);
        }
        setStatus("error"); setError(result.code); return;
      }
      if ("cover" in result.data) applySlice(result.data);
      setPendingUploadId(null);
      setStatus("success");
    } catch (caught) {
      await abandonCatalogUploadAction({ uploadId });
      setPendingUploadId(null);
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "UPLOAD_FAILED");
    }
  }

  async function saveAlt() {
    const result = await saveCatalogCategoryCoverAltAction({ locale, categoryId: detail.id, expectedAssetsUpdatedAt: revision, translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, altText: translations[contentLocale] })) });
    if (result.status === "success") { applySlice(result.data); setStatus("success"); }
    else {
      if (result.code === "STALE") await reconcileRevision();
      setStatus("error"); setError(result.code);
    }
  }

  return <details className="dashboard-catalog-section" data-unsaved={isDirty || undefined}>
    <summary>{labels.sections.cover}{isDirty ? <span className="dashboard-catalog-section-unsaved">{labels.saveState.unsavedLabel}</span> : null}</summary>
    <LocalizedEditorSwitch idPrefix="category-cover" variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={labels.languages} statusByLocale={Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, Boolean(translations[contentLocale].trim())])) as Record<CatalogLocale, boolean>} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.cover.languageLabel} />
    <fieldset disabled={!canManage} className="dashboard-catalog-product-fieldset">
      {(preview || cover?.url) ? <>
        {/* Object-URL previews are not supported by next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview ?? cover?.url} alt="" className="dashboard-catalog-media-preview" />
      </> : <p>{labels.cover.empty}</p>}
      <label htmlFor="catalog-category-cover-upload">{cover ? labels.cover.replace : labels.cover.select}</label>
      <input ref={inputRef} id="catalog-category-cover-upload" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
      {prepared ? <p>{prepared.original.name} · {formatCatalogBytes(prepared.originalByteSize, locale)} → {formatCatalogBytes(prepared.upload.size, locale)}</p> : null}
      <label htmlFor={`catalog-cover-alt-${activeLocale}`}>{labels.cover.altText}</label>
      <input id={`catalog-cover-alt-${activeLocale}`} value={translations[activeLocale]} onChange={(event) => { setTranslations((current) => ({ ...current, [activeLocale]: event.target.value })); onDirty(); }} />
      {status ? <p role="status">{labels.cover.statuses[status]}{status === "uploading" ? ` ${progress}%` : ""}</p> : null}
      {error ? <p role="alert">{labels.cover.errors[error] ?? error}</p> : null}
      <div className="dashboard-catalog-item-controls">
        {prepared ? <DashboardButton type="button" onClick={() => void upload()}>{cover ? labels.cover.replace : labels.cover.upload}</DashboardButton> : null}
        {cover && !prepared ? <DashboardButton type="button" onClick={() => void saveAlt()}>{labels.cover.save}</DashboardButton> : null}
        {cover ? <DashboardButton type="button" variant="danger" onClick={async () => { if (!window.confirm(labels.cover.deleteConfirm)) return; const result = await deleteCatalogCategoryCoverAction({ locale, categoryId: detail.id, expectedAssetsUpdatedAt: revision }); if (result.status === "success") { applySlice(result.data); if (result.data.cleanupPending) setError(labels.cover.cleanupPending); requestAnimationFrame(() => inputRef.current?.focus()); } else { if (result.code === "STALE") await reconcileRevision(); setStatus("error"); setError(result.code); } }}>{labels.cover.remove}</DashboardButton> : null}
      </div>
    </fieldset>
  </details>;
}
