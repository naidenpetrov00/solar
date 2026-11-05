import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getT } from "@/i18n.server";
import {
  listPublicCategoryTree,
  listPublicCategoryBreadcrumbs,
  listPublicChildCategories,
  resolvePublicCategory,
} from "@/lib/catalog/public-categories";
import { getPublicCatalogListing } from "@/lib/catalog/public-catalog-listing";
import {
  hasPublicCatalogQueryState,
  type PublicCatalogSearchParams,
} from "@/lib/catalog/public-catalog-query";
import { listPublicProductsForCategory } from "@/lib/catalog/public-product-list";
import { resolvePublicProduct } from "@/lib/catalog/public-products";
import { catalogLocale } from "@/lib/catalog/public-routes";
import { getPublicSiteUrl } from "@/lib/server-env";
import { CatalogBreadcrumbs } from "../../_components/catalog-breadcrumbs";
import { CatalogCategoryView } from "../../_components/shop-catalog";
import { StructuredData } from "../../_components/structured-data";
import { localizedPath, openGraphLocale } from "../../_lib/routes";

type Props = {
  params: Promise<{ locale: string; categoryPath: string[] }>;
  searchParams: Promise<PublicCatalogSearchParams>;
};

const legacyPackageSlugs = new Set([
  "solar-essentials",
  "solar-smart",
  "solar-storage",
  "solar-complete",
]);

function legacyPackageSlug(segments: string[]) {
  return segments.length === 2 &&
    segments[0] === "solar-packages" &&
    legacyPackageSlugs.has(segments[1])
    ? segments[1]
    : null;
}

async function resolvePage(params: Props["params"]) {
  const { locale, categoryPath } = await params;
  const validatedLocale = catalogLocale(locale);
  if (!validatedLocale) return null;
  const legacySlug = legacyPackageSlug(categoryPath);
  if (legacySlug) {
    const product = await resolvePublicProduct(legacySlug, validatedLocale);
    permanentRedirect(
      localizedPath(
        locale,
        product ? product.product.paths[validatedLocale] : "shop",
      ),
    );
  }
  const requestedPath = categoryPath.join("/");
  const resolution = await resolvePublicCategory(
    requestedPath,
    validatedLocale,
  );
  return resolution ? { locale, validatedLocale, resolution } : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [page, query] = await Promise.all([resolvePage(params), searchParams]);
  if (!page) return {};
  const { category } = page.resolution;
  const [children, products] = await Promise.all([
    listPublicChildCategories(category.id, page.validatedLocale),
    listPublicProductsForCategory(category.id, page.validatedLocale),
  ]);
  const title = category.seoTitle || category.name;
  const description = category.metaDescription || category.introduction;
  const languages = Object.fromEntries([
    ...Object.entries(category.paths).map(([locale, path]) => [
      locale,
      localizedPath(locale, `shop/${path}`),
    ]),
    ["x-default", localizedPath("bg", `shop/${category.paths.bg}`)],
  ]);
  const emptyLeaf = children.length === 0 && products.length === 0;

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(page.locale, `shop/${category.path}`),
      languages,
    },
    robots:
      emptyLeaf || hasPublicCatalogQueryState(query)
        ? { index: false, follow: true }
        : undefined,
    openGraph: {
      title,
      description,
      locale: openGraphLocale(page.locale),
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [page, query] = await Promise.all([resolvePage(params), searchParams]);
  if (!page) notFound();
  const { category } = page.resolution;
  if (!page.resolution.canonical) {
    permanentRedirect(localizedPath(page.locale, `shop/${category.path}`));
  }
  const [categories, listing, breadcrumbCategories, translation] =
    await Promise.all([
      listPublicCategoryTree(page.validatedLocale),
      getPublicCatalogListing({
        categoryId: category.id,
        locale: page.validatedLocale,
        searchParams: query,
      }),
      listPublicCategoryBreadcrumbs(category.id, page.validatedLocale),
      getT("common", { lng: page.locale }),
    ]);
  const { t } = translation;
  const origin = getPublicSiteUrl();
  const breadcrumbItems = [
    {
      label: t("navigation.shop"),
      href: localizedPath(page.locale, "shop"),
    },
    ...breadcrumbCategories.map((item, index) => ({
      label: item.name,
      href:
        index === breadcrumbCategories.length - 1
          ? undefined
          : localizedPath(page.locale, `shop/${item.path}`),
    })),
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? new URL(item.href, origin).toString() : undefined,
    })),
  };

  return (
    <>
      <CatalogCategoryView
        locale={page.locale}
        categories={categories}
        category={category}
        listing={listing}
        breadcrumbs={
          <CatalogBreadcrumbs
            label={t("pages.shop.breadcrumbLabel")}
            items={breadcrumbItems}
          />
        }
      />
      <StructuredData value={breadcrumbSchema} />
    </>
  );
}
