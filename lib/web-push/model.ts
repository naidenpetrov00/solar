export const webPushSubscriptionStatuses = [
  "active",
  "disabled",
  "expired",
] as const;

export type WebPushSubscriptionStatus =
  (typeof webPushSubscriptionStatuses)[number];

export type WebPushPublicConfig =
  | { configured: false }
  | {
      configured: true;
      publicKey: string;
      keyFingerprint: string;
      invitationId: string;
    };

export type BrowserPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type BrowserPushInspection =
  | { state: "unknown" }
  | { state: "ownership_mismatch" }
  | {
      state: "owned_active" | "owned_disabled" | "expired" | "stale_vapid";
      subscriptionId: string;
    };

export type BrowserPushActionResult =
  | { status: "success"; subscriptionId?: string }
  | {
      status: "error";
      code:
        | "FORBIDDEN"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "OWNERSHIP_MISMATCH"
        | "NOT_CONFIGURED"
        | "TEMPORARY_FAILURE";
    };

export const webPushBatchSize = 20;
export const webPushLeaseMilliseconds = 10 * 60 * 1_000;
export const webPushRetryDelaysMilliseconds = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
] as const;
