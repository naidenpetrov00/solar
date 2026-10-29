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

const nextConfig: NextConfig = {
  images: storagePattern ? { remotePatterns: [storagePattern] } : undefined,
};

export default nextConfig;
