"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/button";
import { useCart } from "./cart-store";

type Props = {
  id: string;
  name: string;
  addLabel: string;
  addedLabel: string;
  accessibleLabel: string;
  cartHref: string;
  cartLabel: string;
};

export function AddToCartButton({
  id,
  name,
  addLabel,
  addedLabel,
  accessibleLabel,
  cartHref,
  cartLabel,
}: Props) {
  const router = useRouter();
  const { addItem, ready } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    if (added) {
      router.push(cartHref);
      return;
    }
    addItem(id);
    setAdded(true);
  };

  return (
    <>
      <Button
        type="button"
        className="shop-add-button"
        variant="secondary"
        aria-label={added ? cartLabel : accessibleLabel}
        disabled={!ready}
        onClick={handleClick}
      >
        {added ? (
          <>
            <svg
              aria-hidden="true"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9.5" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {cartLabel}
          </>
        ) : addLabel}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {added ? `${name}: ${addedLabel}` : ""}
      </span>
    </>
  );
}
