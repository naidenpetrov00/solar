export type OrderNotificationErrorCode =
  | "DUPLICATE_ACTIVE_EMAIL"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "NOT_RETRYABLE"
  | "STALE";

export class OrderNotificationError extends Error {
  constructor(
    readonly code: OrderNotificationErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = "OrderNotificationError";
  }
}
