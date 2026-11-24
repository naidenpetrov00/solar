import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/server-env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", getPublicSiteUrl()).toString(),
  };
}
