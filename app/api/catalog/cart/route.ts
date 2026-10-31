import { NextResponse } from "next/server";

import { isUuid } from "@/lib/catalog/model";
import { listPublicCartProducts } from "@/lib/catalog/public-products";
import { catalogLocale } from "@/lib/catalog/public-routes";
import { maximumOrderItems } from "@/lib/orders/model";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = catalogLocale(url.searchParams.get("locale") ?? "");
  const ids = [...new Set(url.searchParams.getAll("id"))];

  if (
    !locale ||
    ids.length > maximumOrderItems ||
    ids.some((id) => !isUuid(id))
  ) {
    return NextResponse.json({ products: [] }, { status: 400 });
  }

  const result = await listPublicCartProducts(locale, ids);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
