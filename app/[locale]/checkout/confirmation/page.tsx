import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import { assertCustomerPolicyReadiness } from "@/lib/legal/policy-facts";
import { orderConfirmationCookieName, readOrderConfirmationToken } from "@/lib/orders/confirmation-token";
import { localizedPath } from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getT("checkout", { lng: locale });
  return { title: t("confirmation.title"), description: t("confirmation.description"), robots: { index: false, follow: false } };
}

export default async function ConfirmationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  assertCustomerPolicyReadiness();
  const { t } = await getT("checkout", { lng: locale });
  const token = readOrderConfirmationToken((await cookies()).get(orderConfirmationCookieName)?.value);
  return <main id="main-content" className="checkout-page checkout-confirmation-page"><div className="checkout-confirmation">
    <h1>{token ? t("confirmation.title") : t("confirmation.unavailableTitle")}</h1>
    {token ? <>
      <p className="checkout-order-number"><span>{t("confirmation.orderNumber")}</span><strong>{token.orderNumber}</strong></p>
      <p>{t("confirmation.pending")}</p><p>{t("confirmation.noPayment")}</p>
    </> : <p>{t("confirmation.unavailableDescription")}</p>}
    <div className="checkout-confirmation-actions"><ButtonLink href={localizedPath(locale, "shop")}>{t("confirmation.shop")}</ButtonLink><ButtonLink href={localizedPath(locale, "cart")} variant="secondary">{t("confirmation.cart")}</ButtonLink></div>
    <nav aria-label={t("confirmation.informationLinks")}><Link href={localizedPath(locale, "privacy")}>{t("confirmation.privacy")}</Link><Link href={localizedPath(locale, "terms")}>{t("confirmation.terms")}</Link></nav>
  </div></main>;
}
