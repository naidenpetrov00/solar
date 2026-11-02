export type CheckoutField =
  | "name"
  | "phone"
  | "email"
  | "city"
  | "deliveryAddress"
  | "note"
  | "paymentMethod"
  | "privacyAcknowledged";

export type CheckoutActionResult =
  | { status: "idle" }
  | {
      status: "invalid";
      fieldErrors: Partial<Record<CheckoutField, "REQUIRED" | "INVALID">>;
    }
  | { status: "cart_stale" }
  | { status: "possible_duplicate" }
  | { status: "temporary_failure" }
  | { status: "success"; confirmationHref: string; submissionKey: string };

export const initialCheckoutActionResult: CheckoutActionResult = { status: "idle" };
