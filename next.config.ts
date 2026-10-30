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
  storagePattern !== null;
const allowedDevOrigins = [
  ...new Set(
    (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .flatMap((origin) => {
        try {
          return [new URL(origin).hostname];
        } catch {
          return [];
        }
      }),
  ),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOrigins.length ? allowedDevOrigins : undefined,
  images: storagePattern
    ? {
        remotePatterns: [storagePattern],
        dangerouslyAllowLocalIP: allowLocalStorageImage,
      }
    : undefined,
};

export default nextConfig;
