export const orderNotificationKinds = [
  "customer_order_received",
  "customer_order_approved",
  "customer_order_rejected",
  "customer_order_cancelled",
  "internal_new_order",
] as const;

export const orderNotificationStatuses = [
  "pending",
  "processing",
  "sent",
  "failed",
] as const;

export const orderNotificationErrorCodes = [
  "SMTP_TEMPORARY",
  "SMTP_PERMANENT",
  "COMPOSITION_FAILED",
  "TEMPLATE_UNSUPPORTED",
  "SNAPSHOT_INVALID",
] as const;

export type OrderNotificationKind = (typeof orderNotificationKinds)[number];
export type OrderNotificationStatus = (typeof orderNotificationStatuses)[number];
export type OrderNotificationErrorCode =
  (typeof orderNotificationErrorCodes)[number];
export type OrderNotificationFailureDisposition =
  | "permanent"
  | "retry_exhausted";

export const orderNotificationTemplateVersion = 1;
export const orderNotificationBatchSize = 10;
export const orderNotificationMaximumBatchSize = 25;
export const orderNotificationLeaseMilliseconds = 10 * 60 * 1_000;
export const orderNotificationRetryDelaysMilliseconds = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
] as const;

export function isOrderNotificationKind(
  value: unknown,
): value is OrderNotificationKind {
  return (
    typeof value === "string" &&
    (orderNotificationKinds as readonly string[]).includes(value)
  );
}

export function isOrderNotificationStatus(
  value: unknown,
): value is OrderNotificationStatus {
  return (
    typeof value === "string" &&
    (orderNotificationStatuses as readonly string[]).includes(value)
  );
}

export function isOrderNotificationErrorCode(
  value: unknown,
): value is OrderNotificationErrorCode {
  return (
    typeof value === "string" &&
    (orderNotificationErrorCodes as readonly string[]).includes(value)
  );
}
