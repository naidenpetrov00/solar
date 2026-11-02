"use client";

import { useCallback } from "react";
import { Button, ButtonLink } from "@/components/button";
import { useCartHydration } from "../_components/use-cart-hydration";
import { CheckoutForm } from "./checkout-form";
import type { CheckoutLabels } from "./checkout-labels";
import { CheckoutReview } from "./checkout-review";

export function CheckoutFlow({ locale, cartHref, shopHref, privacyHref, termsHref, labels }: {
  locale: string;
  cartHref: string;
  shopHref: string;
  privacyHref: string;
  termsHref: string;
  labels: CheckoutLabels;
}) {
  const cart = useCartHydration(locale, labels.cartUpdated);
  const { setHydrationAttempt } = cart;
  const refreshCart = useCallback(
    () => setHydrationAttempt((value) => value + 1),
    [setHydrationAttempt],
  );
  const loading = !cart.ready || cart.hydrating || (!cart.hydrationError && cart.items.length > 0 && cart.resolvedItems.length !== cart.items.length);
  if (loading) return <p className="checkout-state" role="status">{labels.loading}</p>;
  if (cart.hydrationError) return <div className="checkout-state-panel" role="alert">
    <p>{labels.hydrationFailed}</p>
    <Button type="button" variant="secondary" onClick={refreshCart}>{labels.retry}</Button>
  </div>;
  if (!cart.items.length) return <div className="checkout-state-panel">
    <h2>{labels.emptyTitle}</h2><p>{labels.emptyDescription}</p>
    <div><ButtonLink href={shopHref}>{labels.continueShopping}</ButtonLink><ButtonLink href={cartHref} variant="secondary">{labels.backToCart}</ButtonLink></div>
  </div>;
  return <>
    {cart.storageUnavailable ? <p className="checkout-notice" role="alert">{labels.storageUnavailable}</p> : null}
    {cart.announcement ? <p className="checkout-notice" role="status">{cart.announcement}</p> : null}
    <div className="checkout-layout">
      <CheckoutForm
        locale={locale}
        cartHref={cartHref}
        items={cart.items}
        labels={labels}
        privacyHref={privacyHref}
        termsHref={termsHref}
        onCartStale={refreshCart}
        onSuccess={cart.consumeItems}
      />
      <CheckoutReview cart={cart} locale={locale} labels={labels.review} />
    </div>
  </>;
}
