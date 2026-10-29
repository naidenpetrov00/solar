import type { NextConfig } from "next";

const storagePublicBase = process.env.CATALOG_STORAGE_PUBLIC_BASE_URL;
const storagePattern = storagePublicBase
  ? new URL(
      "catalog/assets/**",
      storagePublicBase.endsWith("/")
        ? storagePublicBase
        : `${storagePublicBase}/`,
    )
  : null;
const allowLocalStorageImage =
  process.env.NODE_ENV !== "production" &&
  storagePattern !== null &&
  ["127.0.0.1", "localhost", "::1"].includes(storagePattern.hostname);

const nextConfig: NextConfig = {
  images: storagePattern
    ? {
        remotePatterns: [storagePattern],
        dangerouslyAllowLocalIP: allowLocalStorageImage,
      }
    : undefined,
};

export default nextConfig;
