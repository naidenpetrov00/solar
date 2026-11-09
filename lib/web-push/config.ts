import "server-only";

import { createHash, createHmac } from "node:crypto";

import type { WebPushPublicConfig } from "@/lib/web-push/model";

type WebPushEnvironment = {
  subject: string;
  publicKey: string;
  privateKey: string;
  keyFingerprint: string;
};

function fingerprint(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSubject(value: string) {
  if (value.startsWith("mailto:")) return value.length > 7;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getWebPushEnvironment(): WebPushEnvironment | null {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const values = [subject, publicKey, privateKey];
  if (values.every((value) => !value)) return null;
  if (
    !subject ||
    !publicKey ||
    !privateKey ||
    !validSubject(subject) ||
    !/^[A-Za-z0-9_-]{80,120}$/u.test(publicKey) ||
    !/^[A-Za-z0-9_-]{40,80}$/u.test(privateKey) ||
    values.some((value) => value?.startsWith("replace-with-"))
  ) {
    throw new Error("Web Push VAPID configuration is incomplete or invalid.");
  }
  return { subject, publicKey, privateKey, keyFingerprint: fingerprint(publicKey) };
}

export function getWebPushPublicConfig(
  recipientUserId: string,
): WebPushPublicConfig {
  try {
    const environment = getWebPushEnvironment();
    if (!environment) return { configured: false };
    return {
      configured: true,
      publicKey: environment.publicKey,
      keyFingerprint: environment.keyFingerprint,
      invitationId: createHmac("sha256", environment.privateKey)
        .update(recipientUserId, "utf8")
        .digest("base64url"),
    };
  } catch {
    console.error({ event: "web_push_configuration_invalid" });
    return { configured: false };
  }
}

export function webPushEndpointHash(endpoint: string) {
  return fingerprint(endpoint);
}
