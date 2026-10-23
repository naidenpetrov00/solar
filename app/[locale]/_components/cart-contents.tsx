"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button, ButtonLink } from "@/components/button";
import { formatCurrencyMinor } from "../_lib/catalog-format";
import { maxCartQuantity, useCart } from "./cart-store";

type CartProduct = {
  id: string;
  title: string;
  href: string;
  priceMinor: string;
  currency: string;
};

type Labels = {
  loading: string;
  empty: string;
  emptyDescription: string;
  continueShopping: string;
  itemCount: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  total: string;
  increaseQuantity: string;
  decreaseQuantity: string;
  removeItem: string;
  quantityChanged: string;
  itemRemoved: string;
  unavailableRemoved: string;
  hydrationFailed: string;
  retry: string;
  storageUnavailable: string;
  priceNote: string;
};

export function CartContents({
  locale,
  shopHref,
  labels,
}: {
  locale: string;
  shopHref: string;
  labels: Labels;
}) {
  const {
    items,
    ready,
    storageUnavailable,
    setQuantity,
    removeItem,
    retainItems,
  } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [hydrating, setHydrating] = useState(false);
  const [hydrationError, setHydrationError] = useState(false);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const itemIds = useMemo(() => items.map(({ id }) => id).join(","), [items]);

  useEffect(() => {
    if (!ready || !itemIds) {
      setProducts([]);
      setHydrating(false);
      setHydrationError(false);
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ locale });
    const requestedIds = itemIds.split(",");
    requestedIds.forEach((id) => query.append("id", id));
    setHydrating(true);
    setHydrationError(false);

    fetch(`/api/catalog/cart?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("cart hydration failed");
        return response.json() as Promise<{ products: CartProduct[] }>;
      })
      .then(({ products: hydratedProducts }) => {
        const validIds = new Set(hydratedProducts.map(({ id }) => id));
        const removed = requestedIds.length - validIds.size;
        setProducts(hydratedProducts);
        if (removed > 0) {
          retainItems(validIds);
          setAnnouncement(labels.unavailableRemoved);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProducts([]);
        setHydrationError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHydrating(false);
      });

    return () => controller.abort();
  }, [
    hydrationAttempt,
    itemIds,
    labels.unavailableRemoved,
    locale,
    ready,
    retainItems,
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const resolvedItems = items.flatMap((item) => {
    const product = productById.get(item.id);
    return product ? [{ item, product }] : [];
  });
  const totalMinor = resolvedItems.reduce(
    (sum, { item, product }) =>
      sum + BigInt(product.priceMinor) * BigInt(item.quantity),
    BigInt(0),
  );
  const resolvedCount = resolvedItems.reduce(
    (sum, { item }) => sum + item.quantity,
    0,
  );

  if (
    !ready ||
    hydrating ||
    (!hydrationError && items.length > 0 && resolvedItems.length !== items.length)
  ) {
    return <p className="cart-state" role="status">{labels.loading}</p>;
  }

  return (
    <div className="cart-content">
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      {storageUnavailable ? <p className="cart-storage-note" role="alert">{labels.storageUnavailable}</p> : null}
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
          <ButtonLink href={shopHref} id="cart-empty-shop-link">{labels.continueShopping}</ButtonLink>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {resolvedItems.map(({ item, product }, index) => {
              const lineTotal = BigInt(product.priceMinor) * BigInt(item.quantity);
              return (
                <li className="cart-item" key={item.id}>
                  <div className="cart-item-main">
                    <Link href={product.href} id={`cart-product-${product.id}`}>{product.title}</Link>
                    <p>{labels.unitPrice}: {formatCurrencyMinor(locale, product.priceMinor, product.currency)}</p>
                  </div>
                  <div className="cart-item-controls">
                    <span>{labels.quantity}</span>
                    <div className="cart-quantity-control">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        aria-label={`${labels.decreaseQuantity}: ${product.title}`}
                        disabled={item.quantity <= 1}
                        onClick={() => {
                          setQuantity(item.id, item.quantity - 1);
                          setAnnouncement(`${product.title}: ${labels.quantityChanged} (${item.quantity - 1})`);
                        }}
                      ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14" /></svg></Button>
                      <output aria-label={`${labels.quantity}: ${product.title}`}>{item.quantity}</output>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        aria-label={`${labels.increaseQuantity}: ${product.title}`}
                        disabled={item.quantity >= maxCartQuantity}
                        onClick={() => {
                          setQuantity(item.id, item.quantity + 1);
                          setAnnouncement(`${product.title}: ${labels.quantityChanged} (${item.quantity + 1})`);
                        }}
                      ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14" /></svg></Button>
                    </div>
                    <Button
                      type="button"
                      variant="informational"
                      tone="danger"
                      aria-label={`${labels.removeItem}: ${product.title}`}
                      onClick={() => {
                        const nextItem = resolvedItems[index + 1] ?? resolvedItems[index - 1];
                        removeItem(item.id);
                        setAnnouncement(`${product.title}: ${labels.itemRemoved}`);
                        window.requestAnimationFrame(() => {
                          document.getElementById(nextItem ? `cart-product-${nextItem.product.id}` : "cart-empty-shop-link")?.focus();
                        });
                      }}
                    >{labels.removeItem}</Button>
                  </div>
                  <p className="cart-line-total">
                    <span>{labels.lineTotal}</span>
                    <strong>{formatCurrencyMinor(locale, lineTotal.toString(), product.currency)}</strong>
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="cart-summary">
            <p><span>{labels.itemCount}</span><strong>{resolvedCount}</strong></p>
            <p className="cart-grand-total"><span>{labels.total}</span><strong>{formatCurrencyMinor(locale, totalMinor.toString())}</strong></p>
            <p className="cart-price-note">{labels.priceNote}</p>
            <ButtonLink href={shopHref}>{labels.continueShopping}</ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
