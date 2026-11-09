import "server-only";

import { sendNotification } from "web-push";

import { getWebPushEnvironment } from "@/lib/web-push/config";
import { assertSafePushEndpoint } from "@/lib/web-push/validation";

export type WebPushDeliveryResult =
  | { status: "sent" }
  | { status: "gone" }
  | { status: "retryable" };

function statusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : null;
}

export async function sendWebPush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: string;
  topic: string;
}): Promise<WebPushDeliveryResult> {
  try {
    const environment = getWebPushEnvironment();
    if (!environment) return { status: "retryable" };
    await assertSafePushEndpoint(input.endpoint);
    await sendNotification(
      {
        endpoint: input.endpoint,
        keys: { p256dh: input.p256dh, auth: input.auth },
      },
      input.payload,
      {
        vapidDetails: {
          subject: environment.subject,
          publicKey: environment.publicKey,
          privateKey: environment.privateKey,
        },
        TTL: 24 * 60 * 60,
        urgency: "normal",
        topic: input.topic,
        timeout: 15_000,
      },
    );
    return { status: "sent" };
  } catch (error) {
    const code = statusCode(error);
    if (code === 404 || code === 410) return { status: "gone" };
    return { status: "retryable" };
  }
}
