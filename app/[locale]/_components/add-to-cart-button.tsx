"use client";

import { useEffect, useState } from "react";
import { useCart } from "./cart-store";

type Props = {
  id: string;
  name: string;
  addLabel: string;
  addedLabel: string;
  accessibleLabel: string;
};

export function AddToCartButton({ id, name, addLabel, addedLabel, accessibleLabel }: Props) {
  const { addItem, ready } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timeout = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [added]);

  return (
    <>
      <button
        type="button"
        className="shop-add-button"
        aria-label={accessibleLabel}
        disabled={!ready}
        onClick={() => { addItem(id); setAdded(true); }}
      >
        {added ? addedLabel : addLabel}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {added ? `${name}: ${addedLabel}` : ""}
      </span>
    </>
  );
}
