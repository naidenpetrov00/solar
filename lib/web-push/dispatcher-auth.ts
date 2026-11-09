import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { requireServerEnvironmentVariable } from "@/lib/server-env";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authenticateWebPushDispatcher(request: Request) {
  const secret = requireServerEnvironmentVariable("WEB_PUSH_DISPATCH_SECRET");
  if (Buffer.byteLength(secret, "utf8") < 32 || secret.startsWith("replace-with-")) {
    throw new Error("WEB_PUSH_DISPATCH_SECRET is not configured securely.");
  }
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  return timingSafeEqual(digest(secret), digest(supplied));
}
