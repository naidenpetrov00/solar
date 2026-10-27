import Link from "next/link";
import { Button } from "@/components/button";
import { formatCurrencyMinor } from "../_lib/catalog-format";
import { maxCartQuantity } from "./cart-store";
import type { CartLabels } from "./cart-labels";
import type { useCartHydration } from "./use-cart-hydration";
export function CartLineItem({
  entry,
  index,
  cart,
  locale,
  labels,
}: {
  entry: ReturnType<typeof useCartHydration>["resolvedItems"][number];
  index: number;
  cart: ReturnType<typeof useCartHydration>;
  locale: string;
  labels: CartLabels;
}) {
  const { item, product } = entry;
  const { resolvedItems, setQuantity, removeItem, setAnnouncement } = cart;

  const lineTotal = BigInt(product.priceMinor) * BigInt(item.quantity);
  return (
    <li className="cart-item" key={item.id}>
      <div className="cart-item-main">
        <Link href={product.href} id={`cart-product-${product.id}`}>
          {product.title}
        </Link>
        <p>
          {labels.unitPrice}:{" "}
          {formatCurrencyMinor(locale, product.priceMinor, product.currency)}
        </p>
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
              setAnnouncement(
                `${product.title}: ${labels.quantityChanged} (${item.quantity - 1})`,
              );
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 12h14" />
            </svg>
          </Button>
          <output aria-label={`${labels.quantity}: ${product.title}`}>
            {item.quantity}
          </output>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={`${labels.increaseQuantity}: ${product.title}`}
            disabled={item.quantity >= maxCartQuantity}
            onClick={() => {
              setQuantity(item.id, item.quantity + 1);
              setAnnouncement(
                `${product.title}: ${labels.quantityChanged} (${item.quantity + 1})`,
              );
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </Button>
        </div>
        <Button
          type="button"
          variant="informational"
          tone="danger"
          aria-label={`${labels.removeItem}: ${product.title}`}
          onClick={() => {
            const nextItem =
              resolvedItems[index + 1] ?? resolvedItems[index - 1];
            removeItem(item.id);
            setAnnouncement(`${product.title}: ${labels.itemRemoved}`);
            window.requestAnimationFrame(() => {
              document
                .getElementById(
                  nextItem
                    ? `cart-product-${nextItem.product.id}`
                    : "cart-empty-shop-link",
                )
                ?.focus();
            });
          }}
        >
          {labels.removeItem}
        </Button>
      </div>
      <p className="cart-line-total">
        <span>{labels.lineTotal}</span>
        <strong>
          {formatCurrencyMinor(locale, lineTotal.toString(), product.currency)}
        </strong>
      </p>
    </li>
  );
}
