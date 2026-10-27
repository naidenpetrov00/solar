"use client";

import { Button, ButtonLink } from "@/components/button";
import { formatCurrencyMinor } from "../_lib/catalog-format";
import { useCartHydration } from "./use-cart-hydration";
import { CartLineItem } from "./cart-line-item";
import type { CartLabels } from "./cart-labels";

export function CartContents({
  locale,
  shopHref,
  labels,
}: {
  locale: string;
  shopHref: string;
  labels: CartLabels;
}) {
  const cart = useCartHydration(locale, labels.unavailableRemoved);
  const {
    items,
    ready,
    storageUnavailable,
    announcement,
    hydrating,
    hydrationError,
    setHydrationAttempt,
    resolvedItems,
    resolvedCount,
    totalMinor,
  } = cart;

  if (
    !ready ||
    hydrating ||
    (!hydrationError &&
      items.length > 0 &&
      resolvedItems.length !== items.length)
  ) {
    return (
      <p className="cart-state" role="status">
        {labels.loading}
      </p>
    );
  }

  return (
    <div className="cart-content">
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {storageUnavailable ? (
        <p className="cart-storage-note" role="alert">
          {labels.storageUnavailable}
        </p>
      ) : null}
      {hydrationError ? (
        <div className="cart-hydration-failure" role="alert">
          <p>{labels.hydrationFailed}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setHydrationAttempt((attempt) => attempt + 1)}
          >
            {labels.retry}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="cart-empty">
          <h2>{labels.empty}</h2>
          <p>{labels.emptyDescription}</p>
          <ButtonLink href={shopHref} id="cart-empty-shop-link">
            {labels.continueShopping}
          </ButtonLink>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {resolvedItems.map((entry, index) => (
              <CartLineItem
                key={entry.item.id}
                entry={entry}
                index={index}
                cart={cart}
                locale={locale}
                labels={labels}
              />
            ))}
          </ul>
          <div className="cart-summary">
            <p>
              <span>{labels.itemCount}</span>
              <strong>{resolvedCount}</strong>
            </p>
            <p className="cart-grand-total">
              <span>{labels.total}</span>
              <strong>
                {formatCurrencyMinor(locale, totalMinor.toString())}
              </strong>
            </p>
            <p className="cart-price-note">{labels.priceNote}</p>
            <ButtonLink href={shopHref}>{labels.continueShopping}</ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
