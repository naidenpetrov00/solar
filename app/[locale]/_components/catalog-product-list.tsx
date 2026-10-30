import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import type { PublicCatalogProductSummary } from "@/lib/catalog/public-types";
import { localizedPath } from "../_lib/routes";
import { AddToCartButton } from "./add-to-cart-button";
import { CatalogMedia } from "./catalog-media";
import { CatalogPrice } from "./catalog-price";

export async function ProductList({
  locale,
  products,
}: {
  locale: string;
  products: PublicCatalogProductSummary[];
}) {
  const { t } = await getT("common", { lng: locale });

  if (products.length === 0) return null;

  return (
    <div className="catalog-product-grid">
      {products.map((product) => {
        const href = localizedPath(locale, `products/${product.slug}`);
        return (
          <article className="catalog-product-card" key={product.id}>
            <Link
              className="catalog-product-card-media"
              href={href}
              aria-label={product.title}
            >
              <div>
                {product.primaryMedia ? (
                  <CatalogMedia
                    reference={product.primaryMedia.reference}
                    altText={product.primaryMedia.altText}
                    source={product.primaryMedia.source}
                    width={product.primaryMedia.width}
                    height={product.primaryMedia.height}
                    sizes="(max-width: 48rem) 100vw, 22rem"
                  />
                ) : null}
              </div>
            </Link>
            <div className="catalog-product-card-copy">
              {product.marketingLabel ? (
                <p className="catalog-marketing-label">
                  {product.marketingLabel}
                </p>
              ) : null}
              <h3><Link href={href}>{product.title}</Link></h3>
              <p>{product.shortDescription}</p>
            </div>
            <div className="catalog-product-card-commerce">
              <p>
                {product.price ? (
                  <CatalogPrice
                    locale={locale}
                    price={product.price}
                    fromLabel={t("pages.shop.priceFrom")}
                    saveLabel={t("pages.shop.savePercentage")}
                    vatLabel={t("pages.shop.vatIncluded")}
                  />
                ) : (
                  <strong>{t("pages.shop.priceOnRequest")}</strong>
                )}
              </p>
              {product.salesMode === "direct_purchase" &&
              product.availability === "in_stock" &&
              product.price ? (
                <AddToCartButton
                  id={product.id}
                  name={product.title}
                  addLabel={t("pages.shop.addToCart")}
                  addedLabel={t("pages.shop.addedToCart")}
                  accessibleLabel={t("pages.shop.addNamedToCart", {
                    name: product.title,
                  })}
                />
              ) : product.salesMode === "direct_purchase" &&
                product.availability !== "in_stock" ? (
                <span className="catalog-availability">
                  {t("pages.shop.outOfStock")}
                </span>
              ) : (
                <ButtonLink
                  variant="secondary"
                  href={localizedPath(locale, "contact")}
                >
                  {t("pages.shop.enquire")}
                </ButtonLink>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
