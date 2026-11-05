import type { Metadata } from "next";
import type { PublicCatalogProductDetail } from "@/lib/catalog/public-types";
import type { CatalogLocale } from "@/lib/catalog/model";
import { localizedPath, openGraphLocale } from "../../_lib/routes";

export function createProductMetadata(
  product: PublicCatalogProductDetail,
  locale: string,
  validatedLocale: CatalogLocale,
): Metadata {
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
      canonical: localizedPath(locale, product.paths[validatedLocale]),
      languages,
    },
    openGraph: {
      title,
      description,
      locale: openGraphLocale(locale),
      type: "website",
      images: socialImage
        ? [{ url: socialImage.reference, alt: socialImage.altText }]
        : undefined,
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title,
      description,
      images: socialImage ? [socialImage.reference] : undefined,
    },
  };
}
