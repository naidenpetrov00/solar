import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import {
  catalogLocale,
  listPublicCategoryBreadcrumbs,
  resolvePublicProduct,
} from "@/lib/catalog/public";
import { getPublicSiteUrl } from "@/lib/server-env";
import { AddToCartButton } from "../../_components/add-to-cart-button";
import { CatalogBreadcrumbs } from "../../_components/catalog-breadcrumbs";
import { CatalogProductDetail } from "../../_components/catalog-product-detail";
import { StructuredData } from "../../_components/structured-data";
import { formatCurrencyMinor } from "../../_lib/catalog-format";
import { localizedPath, openGraphLocale } from "../../_lib/routes";

type Props = {
  params: Promise<{ locale: string; productSlug: string }>;
};

async function resolvePage(params: Props["params"]) {
  const { locale, productSlug } = await params;
  const validatedLocale = catalogLocale(locale);
  if (!validatedLocale) return null;
  const resolution = await resolvePublicProduct(productSlug, validatedLocale);
  return resolution ? { locale, validatedLocale, resolution } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await resolvePage(params);
  if (!page) return {};
  const product = page.resolution.product;
  const title = product.seoTitle || product.title;
  const description = product.metaDescription || product.shortDescription;
  const socialImage =
    product.media.find(({ isSocialImage }) => isSocialImage) ??
    product.primaryMedia;
  const languages = Object.fromEntries([
    ...Object.entries(product.paths).map(([locale, path]) => [
      locale,
      localizedPath(locale, path),
    ]),
    ["x-default", localizedPath("bg", product.paths.bg)],
  ]);

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(page.locale, product.paths[page.validatedLocale]),
      languages,
    },
    openGraph: {
      title,
      description,
      locale: openGraphLocale(page.locale),
      type: "website",
      images: socialImage ? [{ url: socialImage.reference, alt: socialImage.altText }] : undefined,
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title,
      description,
      images: socialImage ? [socialImage.reference] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const page = await resolvePage(params);
  if (!page) notFound();
  const product = page.resolution.product;
  if (!page.resolution.canonical) {
    permanentRedirect(
      localizedPath(page.locale, product.paths[page.validatedLocale]),
    );
  }
  const [categoryBreadcrumbs, translation] = await Promise.all([
    listPublicCategoryBreadcrumbs(
      product.primaryCategory.id,
      page.validatedLocale,
    ),
    getT("common", { lng: page.locale }),
  ]);
  const { t } = translation;
  const price = product.price
    ? `${product.price.presentation === "from" ? `${t("pages.shop.priceFrom")} ` : ""}${formatCurrencyMinor(
        page.locale,
        product.price.publicVatInclusiveMinor,
        product.price.currency,
      )}`
    : t("pages.shop.priceOnRequest");
  const specifications = product.specifications.map((specification) => ({
    label: specification.label,
    value: `${
      typeof specification.value === "boolean"
        ? specification.value
          ? t("pages.shop.yes")
          : t("pages.shop.no")
        : specification.value
    }${specification.unit ? ` ${specification.unit}` : ""}`,
  }));
  const breadcrumbItems = [
    { label: t("navigation.shop"), href: localizedPath(page.locale, "shop") },
    ...categoryBreadcrumbs.map((category) => ({
      label: category.name,
      href: localizedPath(page.locale, `shop/${category.path}`),
    })),
    { label: product.title },
  ];
  const origin = getPublicSiteUrl();
  const canonicalUrl = new URL(
    localizedPath(page.locale, product.paths[page.validatedLocale]),
    origin,
  ).toString();
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription,
    sku: product.sku,
    mpn: product.model ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    image: product.media.map(({ reference }) =>
      new URL(reference, origin).toString(),
    ),
    category: product.primaryCategory.name,
    url: canonicalUrl,
    offers: product.price
      ? {
          "@type": "Offer",
          url: canonicalUrl,
          priceCurrency: product.price.currency,
          price: `${BigInt(product.price.publicVatInclusiveMinor) / BigInt(100)}.${String(BigInt(product.price.publicVatInclusiveMinor) % BigInt(100)).padStart(2, "0")}`,
          availability:
            product.salesMode === "direct_purchase"
              ? product.availability === "in_stock"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock"
              : undefined,
        }
      : undefined,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? new URL(item.href, origin).toString() : canonicalUrl,
    })),
  };
  const actions =
    product.salesMode === "direct_purchase" &&
    product.availability === "in_stock" &&
    product.price ? (
      <AddToCartButton
        id={product.id}
        name={product.title}
        addLabel={t("pages.shop.addToCart")}
        addedLabel={t("pages.shop.addedToCart")}
        accessibleLabel={t("pages.shop.addNamedToCart", { name: product.title })}
      />
    ) : product.salesMode === "direct_purchase" &&
      product.availability !== "in_stock" ? null : (
      <ButtonLink href={localizedPath(page.locale, "contact")}>
        {t("pages.shop.enquire")}
      </ButtonLink>
    );

  return (
    <main id="main-content" className="shop-page catalog-product-page">
      <div className="catalog-shell">
        <CatalogBreadcrumbs
          label={t("pages.shop.breadcrumbLabel")}
          items={breadcrumbItems}
        />
        <CatalogProductDetail
          product={{
            title: product.title,
            marketingLabel: product.marketingLabel,
            brand: product.brand,
            model: product.model,
            shortDescription: product.shortDescription,
            fullDescription: product.fullDescription,
            price,
            vatInformation: product.price ? t("pages.shop.vatIncluded") : null,
            availability:
              product.salesMode === "direct_purchase"
                ? product.availability === "in_stock"
                  ? t("pages.shop.inStock")
                  : t("pages.shop.outOfStock")
                : null,
            primaryMedia: product.primaryMedia,
            gallery: product.media,
            specifications,
          }}
          labels={{
            brand: t("pages.shop.brand"),
            model: t("pages.shop.model"),
            specifications: t("pages.shop.specifications"),
            gallery: t("pages.shop.gallery"),
            noImage: t("pages.shop.noImage"),
          }}
          actions={actions}
        />
        {product.additionalCategories.length > 0 ? (
          <aside className="catalog-related-categories" aria-labelledby="catalog-related-categories-title">
            <h2 id="catalog-related-categories-title">{t("pages.shop.relatedCategories")}</h2>
            <ul>
              {product.additionalCategories.map((category) => (
                <li key={category.id}>
                  <Link href={localizedPath(page.locale, `shop/${category.path}`)}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
      <StructuredData value={productSchema} />
      <StructuredData value={breadcrumbSchema} />
    </main>
  );
}
