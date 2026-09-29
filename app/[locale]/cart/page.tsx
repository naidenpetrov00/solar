import type { Metadata } from "next";
import { getT } from "@/i18n.server";
import { CartContents } from "../_components/cart-contents";
import { getPageMetadata } from "../_lib/metadata";
import { localizedPath } from "../_lib/routes";
import { shopProducts } from "../_lib/shop-catalog";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { ...(await getPageMetadata(locale, "cart", "cart", "pages.cart.description")), robots: { index: false, follow: false } };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });
  const products = shopProducts.map((product) => ({
    id: product.id,
    name: t(product.nameKey),
    href: localizedPath(locale, product.href),
    priceBgn: product.priceBgn,
  }));

  return (
    <main id="main-content" className="cart-page">
      <div className="cart-page-inner">
        <header className="cart-introduction">
          <h1>{t("pages.cart.title")}</h1>
          <p>{t("pages.cart.description")}</p>
        </header>
        <CartContents
          locale={locale}
          products={products}
          shopHref={localizedPath(locale, "shop")}
          labels={{
            loading: t("pages.cart.loading"),
            empty: t("pages.cart.empty"),
            emptyDescription: t("pages.cart.emptyDescription"),
            continueShopping: t("pages.cart.continueShopping"),
            itemCount: t("pages.cart.itemCount"),
            quantity: t("pages.cart.quantity"),
            unitPrice: t("pages.cart.unitPrice"),
            lineTotal: t("pages.cart.lineTotal"),
            total: t("pages.cart.total"),
            increaseQuantity: t("pages.cart.increaseQuantity"),
            decreaseQuantity: t("pages.cart.decreaseQuantity"),
            removeItem: t("pages.cart.removeItem"),
            quantityChanged: t("pages.cart.quantityChanged"),
            itemRemoved: t("pages.cart.itemRemoved"),
            storageUnavailable: t("pages.cart.storageUnavailable"),
            priceNote: t("pages.home.residential.packagePriceNote"),
          }}
        />
      </div>
    </main>
  );
}
