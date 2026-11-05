export const orderStatuses = [
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
  "completed",
] as const;

export const orderPaymentStatuses = [
  "unpaid",
  "partially_paid",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
] as const;

export const orderPaymentMethods = [
  "cash_on_delivery",
  "bank_transfer",
  "arranged_by_phone",
] as const;

export const maximumOrderItems = 50;
export const maximumOrderItemQuantity = 999;
export const orderCalculationVersion = 1;

export type OrderStatus = (typeof orderStatuses)[number];
export type OrderPaymentStatus = (typeof orderPaymentStatuses)[number];
export type OrderPaymentMethod = (typeof orderPaymentMethods)[number];

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_approval: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: [],
  cancelled: [],
  completed: [],
};

const paymentTransitions: Record<
  OrderPaymentStatus,
  readonly OrderPaymentStatus[]
> = {
  unpaid: ["partially_paid", "paid", "failed"],
  failed: ["unpaid", "partially_paid", "paid"],
  partially_paid: ["paid", "partially_refunded", "refunded"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
};

export function canTransitionOrder(
  current: OrderStatus,
  next: OrderStatus,
) {
  return orderTransitions[current].includes(next);
}

export function canTransitionPayment(
  current: OrderPaymentStatus,
  next: OrderPaymentStatus,
) {
  return paymentTransitions[current].includes(next);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (orderStatuses as readonly string[]).includes(value)
  );
}

export function isOrderPaymentStatus(
  value: unknown,
): value is OrderPaymentStatus {
  return (
    typeof value === "string" &&
    (orderPaymentStatuses as readonly string[]).includes(value)
  );
}

export function isOrderPaymentMethod(
  value: unknown,
): value is OrderPaymentMethod {
  return (
    typeof value === "string" &&
    (orderPaymentMethods as readonly string[]).includes(value)
  );
}
