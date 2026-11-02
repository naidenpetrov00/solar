import Link from "next/link";
import { formatCurrencyMinor } from "../_lib/catalog-format";
import { CatalogPrice } from "../_components/catalog-price";
import type { useCartHydration } from "../_components/use-cart-hydration";
import type { CheckoutLabels } from "./checkout-labels";

export function CheckoutReview({
  cart,
  locale,
  labels,
}: {
  cart: ReturnType<typeof useCartHydration>;
  locale: string;
  labels: CheckoutLabels["review"];
}) {
  return (
    <section className="checkout-review" aria-labelledby="checkout-review-title">
      <h2 id="checkout-review-title">{labels.title}</h2>
      <ul>
        {cart.resolvedItems.map(({ item, product }) => {
          const lineTotal = BigInt(product.price.effectiveVatInclusiveMinor) * BigInt(item.quantity);
          return (
            <li key={item.id}>
              <div>
                <Link href={product.href}>{product.title}</Link>
                <p>{labels.quantity}: {item.quantity}</p>
              </div>
              <div className="checkout-review-price">
                <span>{labels.unitPrice}</span>
                <CatalogPrice
                  locale={locale}
                  price={product.price}
                  fromLabel={labels.priceFrom}
                  saveLabel={labels.savePercentage}
                  vatLabel={labels.vatIncluded}
                />
              </div>
              <p className="checkout-review-line-total">
                <span>{labels.lineTotal}</span>
                <strong>{formatCurrencyMinor(locale, lineTotal.toString(), product.price.currency)}</strong>
              </p>
            </li>
          );
        })}
      </ul>
      <div className="checkout-review-total">
        <p><span>{labels.itemCount}</span><strong>{cart.resolvedCount}</strong></p>
        <p><span>{labels.total}</span><strong>{formatCurrencyMinor(locale, cart.totalMinor.toString())}</strong></p>
      </div>
      <p className="checkout-advisory">{labels.advisory}</p>
    </section>
  );
}
