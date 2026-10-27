import type { MetadataRoute } from "next";

import { catalogLocales } from "@/lib/catalog/model";
import { listPublicSitemapEntries } from "@/lib/catalog/public-routes";
import { getPublicSiteUrl } from "@/lib/server-env";

function localizedPath(locale: string, path = "") {
  const suffix = path ? `/${path}` : "";
  return locale === "bg" ? suffix || "/" : `/${locale}${suffix}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteUrl();
  const dynamicEntries = await listPublicSitemapEntries();
  const staticPaths = ["", "shop", "projects", "contact"];

  return [
    ...catalogLocales.flatMap((locale) =>
      staticPaths.map((path) => ({
        url: new URL(localizedPath(locale, path), origin).toString(),
        changeFrequency:
          path === "shop" ? ("weekly" as const) : ("monthly" as const),
        priority: path === "" ? 1 : path === "shop" ? 0.9 : 0.6,
      })),
    ),
    ...dynamicEntries.map((entry) => ({
      url: new URL(localizedPath(entry.locale, entry.path), origin).toString(),
      lastModified: entry.updatedAt,
      changeFrequency: "weekly" as const,
      priority: entry.path.startsWith("products/") ? 0.8 : 0.7,
    })),
  ];
}
