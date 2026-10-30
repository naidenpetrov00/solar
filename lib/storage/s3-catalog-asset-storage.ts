import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import sharp from "sharp";
import {
  catalogStorageProvider,
  CatalogStorageError,
  type CatalogAssetStorage,
} from "./catalog-asset-storage";
import { getCatalogStorageConfig } from "./catalog-storage-config";
import {
  catalogImageMaxEdge,
  catalogImageMaxPixels,
} from "@/lib/catalog/catalog-asset-limits";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageFormats = new Set(["jpeg", "png", "webp"]);

function assertStorageKey(key: string, prefix: "catalog/pending/" | "catalog/assets/") {
  if (!key.startsWith(prefix) || key.includes("..") || key.includes("\\")) {
    throw new CatalogStorageError("OBJECT_MISMATCH");
  }
}

function encodeCopySource(bucket: string, key: string) {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function safeAttachmentFilename(value: string) {
  const normalized = value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/gu, "-");
  const trimmed = normalized.replace(/^-+|-+$/gu, "").slice(0, 120);
  return trimmed.toLowerCase().endsWith(".pdf")
    ? trimmed || "document.pdf"
    : `${trimmed || "document"}.pdf`;
}

export class S3CatalogAssetStorage implements CatalogAssetStorage {
  readonly provider = catalogStorageProvider;
  private readonly config = getCatalogStorageConfig();
  private readonly client = new S3Client({
    endpoint: this.config.endpoint,
    region: this.config.region,
    forcePathStyle: this.config.forcePathStyle,
    credentials: {
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    },
  });

  async createDirectUploadAuthorization(input: {
    uploadId: string;
    temporaryKey: string;
    mimeType: string;
    byteSize: number;
    disposition: string;
    expiresAt: Date;
  }) {
    assertStorageKey(input.temporaryKey, "catalog/pending/");
    const expires = Math.max(
      1,
      Math.floor((input.expiresAt.getTime() - Date.now()) / 1000),
    );
    try {
      const authorization = await createPresignedPost(this.client, {
        Bucket: this.config.bucket,
        Key: input.temporaryKey,
        Expires: expires,
        Fields: {
          "Content-Type": input.mimeType,
          "Content-Disposition": input.disposition,
          "x-amz-meta-upload-id": input.uploadId,
        },
        Conditions: [
          ["content-length-range", 1, input.byteSize],
          { "Content-Type": input.mimeType },
          { "Content-Disposition": input.disposition },
          { "x-amz-meta-upload-id": input.uploadId },
        ],
      });
      return {
        url: authorization.url,
        fields: authorization.fields,
        expiresAt: input.expiresAt.toISOString(),
      };
    } catch {
      throw new CatalogStorageError("STORAGE_FAILURE");
    }
  }

  async inspectAndPromoteUpload(input: {
    uploadId: string;
    temporaryKey: string;
    finalKey: string;
    mimeType: string;
    byteSize: number;
    disposition: string;
    purpose: "product_image" | "product_document" | "category_cover";
  }) {
    assertStorageKey(input.temporaryKey, "catalog/pending/");
    assertStorageKey(input.finalKey, "catalog/assets/");
    try {
      const head = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: input.temporaryKey,
        }),
      );
      if (
        head.ContentLength !== input.byteSize ||
        head.ContentType !== input.mimeType ||
        head.Metadata?.["upload-id"] !== input.uploadId ||
        !head.ETag
      ) {
        throw new CatalogStorageError("OBJECT_MISMATCH");
      }

      let width: number | null = null;
      let height: number | null = null;
      if (imageMimeTypes.has(input.mimeType)) {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.config.bucket,
            Key: input.temporaryKey,
          }),
        );
        const body = await response.Body?.transformToByteArray();
        if (!body) throw new CatalogStorageError("OBJECT_MISMATCH");
        let metadata: sharp.Metadata;
        try {
          metadata = await sharp(body, {
            limitInputPixels: catalogImageMaxPixels,
          }).metadata();
        } catch {
          throw new CatalogStorageError("OBJECT_MISMATCH");
        }
        if (
          !metadata.format ||
          !imageFormats.has(metadata.format) ||
          !metadata.width ||
          !metadata.height ||
          metadata.width > catalogImageMaxEdge ||
          metadata.height > catalogImageMaxEdge ||
          metadata.width * metadata.height > catalogImageMaxPixels ||
          (metadata.pages ?? 1) > 1
        ) {
          throw new CatalogStorageError("OBJECT_MISMATCH");
        }
        const expectedMime =
          metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
        if (expectedMime !== input.mimeType) {
          throw new CatalogStorageError("OBJECT_MISMATCH");
        }
        width = metadata.width;
        height = metadata.height;
      } else if (input.mimeType === "application/pdf") {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: this.config.bucket,
            Key: input.temporaryKey,
            Range: "bytes=0-1023",
          }),
        );
        const body = await response.Body?.transformToByteArray();
        if (!body || !Buffer.from(body).subarray(0, 5).equals(Buffer.from("%PDF-"))) {
          throw new CatalogStorageError("OBJECT_MISMATCH");
        }
      } else {
        throw new CatalogStorageError("OBJECT_MISMATCH");
      }

      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.config.bucket,
          Key: input.finalKey,
          CopySource: encodeCopySource(this.config.bucket, input.temporaryKey),
          CopySourceIfMatch: head.ETag,
          MetadataDirective: "REPLACE",
          ContentType: input.mimeType,
          ContentDisposition: input.disposition,
          CacheControl: "public, max-age=31536000, immutable",
          Metadata: { "upload-id": input.uploadId },
        }),
      );
      return {
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        width,
        height,
      };
    } catch (error) {
      if (error instanceof CatalogStorageError) throw error;
      throw new CatalogStorageError("STORAGE_FAILURE");
    }
  }

  resolvePublicAssetUrl(objectKey: string) {
    assertStorageKey(objectKey, "catalog/assets/");
    return new URL(
      objectKey.split("/").map(encodeURIComponent).join("/"),
      this.config.publicBaseUrl,
    ).toString();
  }

  async deleteObject(objectKey: string) {
    if (
      !objectKey.startsWith("catalog/pending/") &&
      !objectKey.startsWith("catalog/assets/")
    ) {
      throw new CatalogStorageError("OBJECT_MISMATCH");
    }
    if (objectKey.includes("..") || objectKey.includes("\\")) {
      throw new CatalogStorageError("OBJECT_MISMATCH");
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
        }),
      );
    } catch {
      throw new CatalogStorageError("STORAGE_FAILURE");
    }
  }
}
