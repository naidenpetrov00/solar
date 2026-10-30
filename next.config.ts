import type { NextConfig } from "next";
import { getAuthOriginConfig } from "./lib/auth-origin-config";

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
const authOrigins = getAuthOriginConfig({
  baseUrl: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  production: process.env.NODE_ENV === "production",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: authOrigins.allowedDevHostnames.length
    ? authOrigins.allowedDevHostnames
    : undefined,
  images: storagePattern
    ? {
        remotePatterns: [storagePattern],
        dangerouslyAllowLocalIP: allowLocalStorageImage,
      }
    : undefined,
};

export default nextConfig;
