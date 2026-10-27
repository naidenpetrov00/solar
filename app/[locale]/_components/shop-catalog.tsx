import Image from "next/image";
import { getT } from "@/i18n.server";
import type {
  PublicCatalogCategory,
  PublicCatalogProductSummary,
} from "@/lib/catalog/public-types";
import { CategoryLinks } from "./catalog-category-links";
import { ProductList } from "./catalog-product-list";

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
      <section
        className="catalog-category-products"
        aria-labelledby="catalog-products-title"
      >
        <h2 id="catalog-products-title">{t("pages.shop.products")}</h2>
        <ProductList locale={locale} products={products} />
      </section>
    </div>
  );
}
