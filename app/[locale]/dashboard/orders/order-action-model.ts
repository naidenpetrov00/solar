import type { EligibleOrderProduct } from "@/lib/orders/management-model";

export type OrderActionCode =
  | "SAVED"
  | "ORDER_STATUS_UPDATED"
  | "PAYMENT_STATUS_UPDATED"
  | "NOTIFICATION_RETRY_QUEUED"
  | "NOTIFICATION_NOT_RETRYABLE"
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STALE"
  | "ORDER_NOT_EDITABLE"
  | "INVALID_STATUS_TRANSITION"
  | "INVALID_PAYMENT_TRANSITION"
  | "TEMPORARY_FAILURE";

export type OrderActionResult = {
  status: "idle" | "success" | "error";
  code?: OrderActionCode;
  mutationVersion?: number;
  fieldErrors?: Record<string, "REQUIRED" | "INVALID">;
};

export const initialOrderActionResult: OrderActionResult = { status: "idle" };

export type ProductSearchResult =
  | { status: "idle" | "pending" }
  | { status: "success"; products: EligibleOrderProduct[] }
  | { status: "error"; code: OrderActionCode };
