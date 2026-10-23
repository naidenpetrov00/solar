import { notFound } from "next/navigation";

import { catalogLocale, listPublicRootCategories } from "@/lib/catalog/public";
import { CatalogLanding } from "../_components/shop-catalog";
import { getPageMetadata } from "../_lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return getPageMetadata(locale, "shop", "shop", "pages.shop.description");
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const validatedLocale = catalogLocale(locale);
  if (!validatedLocale) notFound();
  const categories = await listPublicRootCategories(validatedLocale);
  return <CatalogLanding locale={locale} categories={categories} />;
}
