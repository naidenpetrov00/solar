import "server-only";
import { requireServerEnvironmentVariable } from "@/lib/server-env";

function storageUrl(name: "CATALOG_STORAGE_S3_ENDPOINT" | "CATALOG_STORAGE_PUBLIC_BASE_URL") {
  const value = requireServerEnvironmentVariable(name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be HTTPS, or loopback HTTP for development.`);
  }
  return url;
}

export function getCatalogStorageConfig() {
  const publicBaseUrl = storageUrl("CATALOG_STORAGE_PUBLIC_BASE_URL");
  const endpoint = storageUrl("CATALOG_STORAGE_S3_ENDPOINT");
  if (!publicBaseUrl.pathname.endsWith("/")) publicBaseUrl.pathname += "/";
  return {
    endpoint: endpoint.origin,
    forcePathStyle:
      endpoint.hostname === "localhost" || endpoint.hostname === "127.0.0.1",
    publicBaseUrl,
    region: requireServerEnvironmentVariable("CATALOG_STORAGE_S3_REGION"),
    bucket: requireServerEnvironmentVariable("CATALOG_STORAGE_S3_BUCKET"),
    accessKeyId: requireServerEnvironmentVariable(
      "CATALOG_STORAGE_S3_ACCESS_KEY_ID",
    ),
    secretAccessKey: requireServerEnvironmentVariable(
      "CATALOG_STORAGE_S3_SECRET_ACCESS_KEY",
    ),
  };
}
