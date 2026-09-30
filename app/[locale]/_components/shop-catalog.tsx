import Link from "next/link";
import Image from "next/image";
import { getT } from "@/i18n.server";
import { AddToCartButton } from "./add-to-cart-button";
import { formatBgnPrice, shopCategories } from "../_lib/shop-catalog";
import { localizedPath } from "../_lib/routes";

type Props = { locale: string; categorySlug?: string };

export async function ShopCatalog({ locale, categorySlug }: Props) {
  const { t } = await getT("common", { lng: locale });
  const activeCategory = shopCategories.find((category) => category.slug === categorySlug);
  const visibleCategories = activeCategory ? [activeCategory] : shopCategories;

  return (
    <main id="main-content" className={activeCategory ? "shop-page" : "shop-page shop-page-variant-b"}>
      <header className="shop-introduction">
        <div className="shop-introduction-copy">
          <h1>{t(activeCategory?.titleKey ?? "pages.shop.title")}</h1>
          <p>{t(activeCategory?.descriptionKey ?? "pages.shop.description")}</p>
        </div>
        {!activeCategory && (
          <div className="shop-hero-media">
            {/* Temporary licensed image already used on the welcome page. Replace with verified project photography when available. */}
            <Image
              src="/images/welcome-solar-hero.jpg"
              alt={t("pages.shop.heroImageAlt")}
              fill
              preload
              sizes="100vw"
            />
          </div>
        )}
      </header>
      <div className="shop-layout">
        <nav aria-label={t("pages.shop.categoryNavigation")} className="shop-categories">
          <h2>{t("pages.shop.categories")}</h2>
          <ul>
            {shopCategories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={localizedPath(locale, `shop/${category.slug}`)}
                  aria-current={categorySlug === category.slug ? "page" : undefined}
                >
                  {t(category.titleKey)}
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="shop-results">
          {visibleCategories.map((category) => (
            <section aria-labelledby={`shop-category-${category.slug}`} key={category.slug}>
              <div className="shop-results-heading">
                <h2 id={`shop-category-${category.slug}`}>{t(category.titleKey)}</h2>
                <p>{t("pages.home.residential.packagePriceNote")}</p>
              </div>
              <div className="residential-package-grid shop-product-grid">
                {category.products.map((product) => {
                  const name = t(product.nameKey);
                  return (
                    <article className="residential-package-card shop-product-card" key={product.id}>
                      <Link
                        className="residential-package-card-link"
                        href={localizedPath(locale, product.href)}
                        scroll
                        transitionTypes={["package-detail"]}
                      >
                        <div aria-hidden="true" className="residential-package-visual" />
                        <div className="residential-package-card-content">
                          <p className="residential-package-type">{t(product.energyTypeKey)}</p>
                          <h3>{name}</h3>
                          <p className="residential-package-profile">{t(product.profileKey)}</p>
                          <span className="residential-package-card-action">
                            {t("pages.home.residential.viewPackage")}
                            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
                          </span>
                        </div>
                      </Link>
                      <div className="shop-product-purchase">
                        <p className="residential-package-price">
                          <span>{t("pages.home.residential.packagePrice")}</span>
                          <strong>{formatBgnPrice(locale, product.priceBgn)}</strong>
                        </p>
                        <AddToCartButton
                          id={product.id}
                          name={name}
                          addLabel={t("pages.shop.addToCart")}
                          addedLabel={t("pages.shop.addedToCart")}
                          accessibleLabel={t("pages.shop.addNamedToCart", { name })}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
