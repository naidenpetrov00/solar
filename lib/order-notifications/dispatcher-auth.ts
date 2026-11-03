import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { requireServerEnvironmentVariable } from "@/lib/server-env";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authenticateOrderNotificationDispatcher(request: Request) {
  const secret = requireServerEnvironmentVariable(
    "ORDER_NOTIFICATION_DISPATCH_SECRET",
  );
  if (
    Buffer.byteLength(secret, "utf8") < 32 ||
    secret.startsWith("replace-with-")
  ) {
    throw new Error("ORDER_NOTIFICATION_DISPATCH_SECRET is not configured securely.");
  }
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  return timingSafeEqual(digest(secret), digest(supplied));
}
