import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import type {
  PublicCatalogCategory,
  PublicCatalogProductSummary,
} from "@/lib/catalog/public";
import { formatCurrencyMinor } from "../_lib/catalog-format";
import { localizedPath } from "../_lib/routes";
import { AddToCartButton } from "./add-to-cart-button";
import { CatalogMedia } from "./catalog-media";

function Arrow() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

async function ProductList({
  locale,
  products,
}: {
  locale: string;
  products: PublicCatalogProductSummary[];
}) {
  const { t } = await getT("common", { lng: locale });

  if (products.length === 0) {
    return <p className="catalog-empty-state">{t("pages.shop.emptyProducts")}</p>;
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
                  <p className="catalog-marketing-label">{product.marketingLabel}</p>
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
                {product.price ? <small>{t("pages.shop.vatIncluded")}</small> : null}
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

function CategoryLinks({
  categories,
  locale,
  heading,
  id,
}: {
  categories: PublicCatalogCategory[];
  locale: string;
  heading: string;
  id: string;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="catalog-category-index" aria-labelledby={id}>
      <h2 id={id}>{heading}</h2>
      <div>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={localizedPath(locale, `shop/${category.path}`)}
          >
            <span>{category.name}</span>
            <p>{category.introduction}</p>
            <Arrow />
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function CatalogLanding({
  locale,
  categories,
}: {
  locale: string;
  categories: PublicCatalogCategory[];
}) {
  const { t } = await getT("common", { lng: locale });

  return (
    <main id="main-content" className="shop-page catalog-landing">
      <header className="shop-introduction catalog-hero">
        <div className="shop-introduction-copy">
          <h1>{t("pages.shop.title")}</h1>
          <p>{t("pages.shop.description")}</p>
        </div>
        <div className="shop-hero-media">
          <Image
            src="/images/welcome-solar-hero.jpg"
            alt={t("pages.shop.heroImageAlt")}
            fill
            preload
            sizes="100vw"
          />
        </div>
      </header>
      <div className="catalog-shell">
        <CategoryLinks
          categories={categories}
          locale={locale}
          heading={t("pages.shop.categories")}
          id="catalog-root-categories-title"
        />
        {categories.length === 0 ? (
          <p className="catalog-empty-state">{t("pages.shop.emptyCatalog")}</p>
        ) : null}
      </div>
    </main>
  );
}

export async function CatalogCategoryView({
  locale,
  category,
  siblings,
  children,
  products,
}: {
  locale: string;
  category: PublicCatalogCategory;
  siblings: PublicCatalogCategory[];
  children: PublicCatalogCategory[];
  products: PublicCatalogProductSummary[];
}) {
  const { t } = await getT("common", { lng: locale });

  return (
    <div className="catalog-category-content">
      <header className="catalog-category-heading">
        <h1>{category.name}</h1>
        <p>{category.introduction}</p>
      </header>
      {category.detailedContent ? (
        <div className="catalog-category-description">
          {category.detailedContent}
        </div>
      ) : null}
      <CategoryLinks
        categories={siblings}
        locale={locale}
        heading={t("pages.shop.siblingCategories")}
        id="catalog-sibling-categories-title"
      />
      <CategoryLinks
        categories={children}
        locale={locale}
        heading={t("pages.shop.subcategories")}
        id="catalog-subcategories-title"
      />
      <section className="catalog-category-products" aria-labelledby="catalog-products-title">
        <h2 id="catalog-products-title">{t("pages.shop.products")}</h2>
        <ProductList locale={locale} products={products} />
      </section>
    </div>
  );
}
