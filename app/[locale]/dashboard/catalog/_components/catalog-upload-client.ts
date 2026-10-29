"use client";

import type { CatalogUploadAuthorization } from "@/lib/catalog/management-asset-types";

const imageLimit = 10 * 1024 * 1024;
const pdfLimit = 20 * 1024 * 1024;

export type PreparedCatalogFile = {
  original: File;
  upload: File;
  originalByteSize: number;
  width: number | null;
  height: number | null;
  optimized: boolean;
};

function extension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function outputName(filename: string, outputExtension: string) {
  const stem = filename.replace(/\.[^.]+$/u, "") || "image";
  return `${stem}.${outputExtension}`;
}

export async function prepareCatalogImage(
  file: File,
): Promise<PreparedCatalogFile> {
  if (file.size > imageLimit) throw new Error("IMAGE_TOO_LARGE");
  const ext = extension(file.name);
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !["jpg", "jpeg", "png", "webp"].includes(ext)
  ) {
    throw new Error("INVALID_IMAGE");
  }
  if (!("createImageBitmap" in window)) {
    return {
      original: file,
      upload: file,
      originalByteSize: file.size,
      width: null,
      height: null,
      optimized: false,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    bitmap = await createImageBitmap(file);
  }
  try {
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: file.type !== "image/jpeg" });
    if (!context) throw new Error("IMAGE_PROCESSING_FAILED");
    context.drawImage(bitmap, 0, 0, width, height);
    const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.9),
    );
    canvas.width = 0;
    canvas.height = 0;
    if (
      !blob ||
      blob.type !== outputType ||
      blob.size >= file.size ||
      blob.size > imageLimit
    ) {
      return {
        original: file,
        upload: file,
        originalByteSize: file.size,
        width: bitmap.width,
        height: bitmap.height,
        optimized: false,
      };
    }
    const upload = new File(
      [blob],
      outputName(file.name, outputType === "image/jpeg" ? "jpg" : "webp"),
      { type: outputType, lastModified: file.lastModified },
    );
    return {
      original: file,
      upload,
      originalByteSize: file.size,
      width,
      height,
      optimized: true,
    };
  } finally {
    bitmap.close();
  }
}

export function prepareCatalogPdf(file: File): PreparedCatalogFile {
  if (file.size > pdfLimit) throw new Error("PDF_TOO_LARGE");
  if (file.type !== "application/pdf" || extension(file.name) !== "pdf") {
    throw new Error("INVALID_PDF");
  }
  return {
    original: file,
    upload: file,
    originalByteSize: file.size,
    width: null,
    height: null,
    optimized: false,
  };
}

export function uploadCatalogFile(
  authorization: CatalogUploadAuthorization,
  file: File,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });
    request.open("POST", authorization.url);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      signal.removeEventListener("abort", abort);
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("UPLOAD_FAILED"));
    });
    request.addEventListener("error", () => reject(new Error("UPLOAD_FAILED")));
    request.addEventListener("abort", () => reject(new Error("UPLOAD_CANCELED")));
    const body = new FormData();
    for (const [key, value] of Object.entries(authorization.fields)) {
      body.append(key, value);
    }
    body.append("file", file, file.name);
    request.send(body);
  });
}

export function filenameStem(filename: string) {
  return filename.replace(/\.[^.]+$/u, "").trim() || "Document";
}

export function formatCatalogBytes(value: number, locale: string) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1024)} KB`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / (1024 * 1024))} MB`;
}
