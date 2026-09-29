"use client";

import Link from "next/link";
import { useState } from "react";
import { formatBgnPrice } from "../_lib/shop-catalog";
import { maxCartQuantity, useCart } from "./cart-store";

type CartProduct = {
  id: string;
  name: string;
  href: string;
  priceBgn: number;
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
  storageUnavailable: string;
  priceNote: string;
};

export function CartContents({ locale, products, shopHref, labels }: {
  locale: string;
  products: CartProduct[];
  shopHref: string;
  labels: Labels;
}) {
  const { items, count, ready, storageUnavailable, setQuantity, removeItem } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const productById = new Map(products.map((product) => [product.id, product]));
  const total = items.reduce((sum, item) => sum + (productById.get(item.id)?.priceBgn ?? 0) * item.quantity, 0);

  if (!ready) return <p className="cart-state" role="status">{labels.loading}</p>;

  return (
    <div className="cart-content">
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      {storageUnavailable && <p className="cart-storage-note" role="alert">{labels.storageUnavailable}</p>}
      {items.length === 0 ? (
        <div className="cart-empty">
          <h2>{labels.empty}</h2>
          <p>{labels.emptyDescription}</p>
          <Link className="cart-shop-link" href={shopHref} id="cart-empty-shop-link">{labels.continueShopping}</Link>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {items.map((item, index) => {
              const product = productById.get(item.id);
              if (!product) return null;
              return (
                <li className="cart-item" key={item.id}>
                  <div className="cart-item-main">
                    <Link href={product.href} id={`cart-product-${product.id}`}>{product.name}</Link>
                    <p>{labels.unitPrice}: {formatBgnPrice(locale, product.priceBgn)}</p>
                  </div>
                  <div className="cart-item-controls">
                    <span>{labels.quantity}</span>
                    <div className="cart-quantity-control">
                      <button
                        type="button"
                        aria-label={`${labels.decreaseQuantity}: ${product.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => { setQuantity(item.id, item.quantity - 1); setAnnouncement(`${product.name}: ${labels.quantityChanged} (${item.quantity - 1})`); }}
                      ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
                      <output aria-label={`${labels.quantity}: ${product.name}`}>{item.quantity}</output>
                      <button
                        type="button"
                        aria-label={`${labels.increaseQuantity}: ${product.name}`}
                        disabled={item.quantity >= maxCartQuantity}
                        onClick={() => { setQuantity(item.id, item.quantity + 1); setAnnouncement(`${product.name}: ${labels.quantityChanged} (${item.quantity + 1})`); }}
                      ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14" /></svg></button>
                    </div>
                    <button
                      type="button"
                      className="cart-remove"
                      aria-label={`${labels.removeItem}: ${product.name}`}
                      onClick={() => {
                        const nextItem = items[index + 1] ?? items[index - 1];
                        removeItem(item.id);
                        setAnnouncement(`${product.name}: ${labels.itemRemoved}`);
                        window.requestAnimationFrame(() => {
                          document.getElementById(nextItem ? `cart-product-${nextItem.id}` : "cart-empty-shop-link")?.focus();
                        });
                      }}
                    >{labels.removeItem}</button>
                  </div>
                  <p className="cart-line-total"><span>{labels.lineTotal}</span><strong>{formatBgnPrice(locale, product.priceBgn * item.quantity)}</strong></p>
                </li>
              );
            })}
          </ul>
          <div className="cart-summary">
            <p><span>{labels.itemCount}</span><strong>{count}</strong></p>
            <p className="cart-grand-total"><span>{labels.total}</span><strong>{formatBgnPrice(locale, total)}</strong></p>
            <p className="cart-price-note">{labels.priceNote}</p>
            <Link className="cart-shop-link" href={shopHref}>{labels.continueShopping}</Link>
          </div>
        </>
      )}
    </div>
  );
}
