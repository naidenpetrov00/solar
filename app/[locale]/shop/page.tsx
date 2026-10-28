import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { listPublicCategoryTree } from "@/lib/catalog/public-categories";
import { getPublicCatalogListing } from "@/lib/catalog/public-catalog-listing";
import {
  hasPublicCatalogQueryState,
  type PublicCatalogSearchParams,
} from "@/lib/catalog/public-catalog-query";
import { catalogLocale } from "@/lib/catalog/public-routes";
import { CatalogLanding } from "../_components/shop-catalog";
import { getPageMetadata } from "../_lib/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PublicCatalogSearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const [metadata, query] = await Promise.all([
    getPageMetadata(locale, "shop", "shop", "pages.shop.description"),
    searchParams,
  ]);
  return hasPublicCatalogQueryState(query)
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function ShopPage({
  params,
  searchParams,
}: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const validatedLocale = catalogLocale(locale);
  if (!validatedLocale) notFound();
  const [categories, listing] = await Promise.all([
    listPublicCategoryTree(validatedLocale),
    getPublicCatalogListing({ locale: validatedLocale, searchParams: query }),
  ]);
  return (
    <CatalogLanding locale={locale} categories={categories} listing={listing} />
  );
}
