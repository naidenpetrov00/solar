import { NextResponse } from "next/server";

import { catalogLocale, resolveCatalogLocalePath } from "@/lib/catalog/public";

function localizedPath(locale: string, path = "") {
  const suffix = path ? `/${path.replace(/^\/+|\/+$/gu, "")}` : "";
  return locale === "bg" ? suffix || "/" : `/${locale}${suffix}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = catalogLocale(url.searchParams.get("target") ?? "");
  const sourcePath = url.searchParams.get("path") ?? "";

  if (
    !target ||
    !sourcePath.startsWith("/") ||
    sourcePath.startsWith("//") ||
    sourcePath.length > 2048
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const catalogPath = await resolveCatalogLocalePath(sourcePath, target);
  const destination = new URL(
    localizedPath(target, catalogPath ?? ""),
    url.origin,
  );
  return NextResponse.redirect(destination, 308);
}
