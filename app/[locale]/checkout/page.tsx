import type { Metadata } from "next";
import { getT } from "@/i18n.server";
import { assertCustomerPolicyReadiness } from "@/lib/legal/policy-facts";
import { assertOrderConfirmationConfiguration } from "@/lib/orders/confirmation-token";
import { CheckoutFlow } from "./checkout-flow";
import type { CheckoutLabels } from "./checkout-labels";
import { localizedPath } from "../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getT("checkout", { lng: locale });
  return { title: t("page.title"), description: t("page.description"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  assertCustomerPolicyReadiness();
  assertOrderConfirmationConfiguration();
  const { t } = await getT("checkout", { lng: locale });
  const labels = t("flow", { returnObjects: true }) as CheckoutLabels;
  return <main id="main-content" className="checkout-page">
    <div className="checkout-page-inner">
      <header className="checkout-introduction"><h1>{t("page.title")}</h1><p>{t("page.description")}</p></header>
      <CheckoutFlow
        locale={locale}
        cartHref={localizedPath(locale, "cart")}
        shopHref={localizedPath(locale, "shop")}
        privacyHref={localizedPath(locale, "privacy")}
        termsHref={localizedPath(locale, "terms")}
        labels={labels}
      />
    </div>
  </main>;
}
