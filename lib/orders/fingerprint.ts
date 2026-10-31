import "server-only";

import { createHash } from "node:crypto";

export function guestOrderFingerprint(input: {
  locale: string;
  paymentMethod: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    city: string;
    deliveryAddress: string;
    note: string | null;
  };
  items: Array<{ productId: string; quantity: number }>;
}) {
  const normalized = {
    ...input,
    items: input.items.toSorted((left, right) =>
      left.productId.localeCompare(right.productId),
    ),
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
