import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import type { PublicCatalogProductSummary } from "@/lib/catalog/public-types";
import { formatCurrencyMinor } from "../_lib/catalog-format";
import { localizedPath } from "../_lib/routes";
import { AddToCartButton } from "./add-to-cart-button";
import { CatalogMedia } from "./catalog-media";
import { Arrow } from "./catalog-category-links";

export async function ProductList({
  locale,
  products,
}: {
  locale: string;
  products: PublicCatalogProductSummary[];
}) {
  const { t } = await getT("common", { lng: locale });

  if (products.length === 0) {
    return (
      <p className="catalog-empty-state">{t("pages.shop.emptyProducts")}</p>
    );
  }

  return (
    <div className="catalog-product-list">
      {products.map((product) => {
        const href = localizedPath(locale, `products/${product.slug}`);
        const price = product.price
          ? formatCurrencyMinor(
              locale,
              product.price.publicVatInclusiveMinor,
              product.price.currency,
            )
          : t("pages.shop.priceOnRequest");
        return (
          <article className="catalog-product-row" key={product.id}>
            <Link className="catalog-product-row-link" href={href}>
              <div className="catalog-product-row-media">
                {product.primaryMedia ? (
                  <CatalogMedia
                    reference={product.primaryMedia.reference}
                    altText={product.primaryMedia.altText}
                    sizes="(max-width: 48rem) 100vw, 22rem"
                  />
                ) : null}
              </div>
              <div className="catalog-product-row-copy">
                {product.marketingLabel ? (
                  <p className="catalog-marketing-label">
                    {product.marketingLabel}
                  </p>
                ) : null}
                <h3>{product.title}</h3>
                <p>{product.shortDescription}</p>
                <span className="catalog-inline-link">
                  {t("pages.shop.viewProduct")}
                  <Arrow />
                </span>
              </div>
            </Link>
            <div className="catalog-product-row-commerce">
              <p>
                {product.price?.presentation === "from" ? (
                  <span>{t("pages.shop.priceFrom")}</span>
                ) : null}
                <strong>{price}</strong>
                {product.price ? (
                  <small>{t("pages.shop.vatIncluded")}</small>
                ) : null}
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
