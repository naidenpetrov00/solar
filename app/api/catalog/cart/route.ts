import { NextResponse } from "next/server";

import { isUuid } from "@/lib/catalog/model";
import { listPublicCartProducts } from "@/lib/catalog/public-products";
import { catalogLocale } from "@/lib/catalog/public-routes";

const maximumItems = 50;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = catalogLocale(url.searchParams.get("locale") ?? "");
  const ids = [...new Set(url.searchParams.getAll("id"))];

  if (!locale || ids.length > maximumItems || ids.some((id) => !isUuid(id))) {
    return NextResponse.json({ products: [] }, { status: 400 });
  }

  const products = await listPublicCartProducts(locale, ids);
  return NextResponse.json({ products });
}
