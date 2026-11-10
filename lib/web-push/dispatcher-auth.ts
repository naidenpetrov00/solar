import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { getWebPushEnvironment } from "@/lib/web-push/config";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authenticateWebPushDispatcher(request: Request) {
  const environment = getWebPushEnvironment();
  if (!environment) throw new Error("Web Push is not configured.");
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  return timingSafeEqual(digest(environment.dispatchSecret), digest(supplied));
}
