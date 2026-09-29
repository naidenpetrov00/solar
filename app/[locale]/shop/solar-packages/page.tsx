import { ShopCatalog } from "../../_components/shop-catalog";
import { getPageMetadata } from "../../_lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return getPageMetadata(locale, "shop/solar-packages", "solarPackages", "pages.solarPackages.description");
}

export default async function SolarPackagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ShopCatalog locale={locale} categorySlug="solar-packages" />;
}
