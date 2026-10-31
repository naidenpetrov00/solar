export type OrderErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INVALID_PAYMENT_TRANSITION"
  | "INVALID_STATUS_TRANSITION"
  | "NOT_FOUND"
  | "STALE"
  | "TERMINAL_ORDER";

export class OrderError extends Error {
  constructor(
    readonly code: OrderErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = "OrderError";
  }
}
