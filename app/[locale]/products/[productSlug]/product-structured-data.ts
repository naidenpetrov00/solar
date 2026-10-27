import { getPublicSiteUrl } from "@/lib/server-env";
import type { PublicCatalogProductDetail } from "@/lib/catalog/public-types";
import type { CatalogLocale } from "@/lib/catalog/model";
import { localizedPath } from "../../_lib/routes";

export function productStructuredData(
  product: PublicCatalogProductDetail,
  locale: string,
  validatedLocale: CatalogLocale,
  breadcrumbItems: Array<{ label: string; href?: string }>,
) {
  const origin = getPublicSiteUrl();
  const canonicalUrl = new URL(
    localizedPath(locale, product.paths[validatedLocale]),
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

  return { productSchema, breadcrumbSchema };
}
