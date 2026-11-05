import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { requireServerEnvironmentVariable } from "@/lib/server-env";

export const orderConfirmationCookieName = "solar-order-confirmation";
export const orderConfirmationMaxAgeSeconds = 30 * 60;

function signingKey() {
  const key = requireServerEnvironmentVariable("ORDER_CONFIRMATION_SIGNING_KEY");
  if (Buffer.byteLength(key, "utf8") < 32) {
    throw new Error("ORDER_CONFIRMATION_SIGNING_KEY must be at least 32 bytes.");
  }
  return key;
}

export function assertOrderConfirmationConfiguration() {
  signingKey();
}

function signature(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createOrderConfirmationToken(orderNumber: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ orderNumber, expiresAt: now + orderConfirmationMaxAgeSeconds * 1000 }),
  ).toString("base64url");
  return `v1.${payload}.${signature(payload)}`;
}

export function readOrderConfirmationToken(token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const [version, payload, supplied] = token.split(".");
  if (version !== "v1" || !payload || !supplied) return null;
  const expected = signature(payload);
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !value ||
      typeof value !== "object" ||
      !("orderNumber" in value) ||
      !("expiresAt" in value) ||
      typeof value.orderNumber !== "string" ||
      !/^ORD-[0-9]{6,}$/u.test(value.orderNumber) ||
      typeof value.expiresAt !== "number" ||
      value.expiresAt <= now ||
      Object.keys(value).length !== 2
    ) return null;
    return { orderNumber: value.orderNumber, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}
