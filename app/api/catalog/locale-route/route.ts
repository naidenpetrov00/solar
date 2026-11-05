import { NextResponse } from "next/server";

import {
  catalogLocale,
  resolveCatalogLocalePath,
} from "@/lib/catalog/public-routes";

function localizedPath(locale: string, path = "") {
  const suffix = path ? `/${path.replace(/^\/+|\/+$/gu, "")}` : "";
  return locale === "bg" ? suffix || "/" : `/${locale}${suffix}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = catalogLocale(url.searchParams.get("target") ?? "");
  const sourcePath = url.searchParams.get("path") ?? "";
  const sourceSearch = url.searchParams.get("search") ?? "";

  if (
    !target ||
    !sourcePath.startsWith("/") ||
    sourcePath.startsWith("//") ||
    sourcePath.length > 2048 ||
    sourceSearch.length > 2048
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const catalogPath = await resolveCatalogLocalePath(sourcePath, target);
  const destination = new URL(
    localizedPath(target, catalogPath ?? ""),
    url.origin,
  );
  const preservedSearch = new URLSearchParams(sourceSearch);
  for (const [key, value] of preservedSearch) {
    if (
      key === "sort" ||
      key.startsWith("f.") ||
      key.startsWith("min.") ||
      key.startsWith("max.")
    ) {
      destination.searchParams.append(key, value);
    }
  }
  return NextResponse.redirect(destination, 308);
}
