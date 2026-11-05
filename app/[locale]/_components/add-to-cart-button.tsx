"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/button";
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
      <Button
        type="button"
        className="shop-add-button"
        variant="secondary"
        aria-label={accessibleLabel}
        disabled={!ready}
        onClick={() => { addItem(id); setAdded(true); }}
      >
        {added ? addedLabel : addLabel}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {added ? `${name}: ${addedLabel}` : ""}
      </span>
    </>
  );
}
