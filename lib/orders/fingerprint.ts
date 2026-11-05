import "server-only";

import { createHash } from "node:crypto";

type CheckoutFingerprintInput = {
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
};

export function checkoutOrderFingerprint(
  input: CheckoutFingerprintInput,
  customerUserId: string | null,
) {
  const normalized = {
    ...input,
    items: input.items.toSorted((left, right) =>
      left.productId.localeCompare(right.productId),
    ),
  };
  const fingerprintInput =
    customerUserId === null ? normalized : { ...normalized, customerUserId };
  return createHash("sha256")
    .update(JSON.stringify(fingerprintInput))
    .digest("hex");
}
