import "server-only";

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import type { BrowserPushSubscriptionInput } from "@/lib/web-push/model";

const supportedLocales = new Set(["bg", "en", "tr", "uk"]);

function base64UrlBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return -1;
  try {
    return Buffer.from(value, "base64url").byteLength;
  } catch {
    return -1;
  }
}

function unsafeAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (/^(fc|fd|fe8|fe9|fea|feb)/u.test(normalized)) return true;
  const ipv4 = normalized.startsWith("::ffff:")
    ? normalized.slice("::ffff:".length)
    : normalized;
  if (!/^\d+\.\d+\.\d+\.\d+$/u.test(ipv4)) return false;
  const [first, second] = ipv4.split(".").map(Number);
  return (
    first === 0 || first === 10 || first === 127 || first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function normalizePushEndpoint(endpoint: string) {
  if (typeof endpoint !== "string" || endpoint.length < 12 || endpoint.length > 2048) {
    throw new Error("INVALID_INPUT");
  }
  let url: URL;
  try { url = new URL(endpoint); }
  catch { throw new Error("INVALID_INPUT"); }
  if (
    url.protocol !== "https:" || url.username || url.password ||
    (url.port && url.port !== "443") || isIP(url.hostname) ||
    url.hostname === "localhost" || url.hash
  ) throw new Error("INVALID_INPUT");
  return url.toString();
}

export async function assertSafePushEndpoint(endpoint: string) {
  const normalized = normalizePushEndpoint(endpoint);
  const url = new URL(normalized);
  let addresses: Array<{ address: string; family: number }>;
  try { addresses = await lookup(url.hostname, { all: true, verbatim: true }); }
  catch { throw new Error("TEMPORARY_FAILURE"); }
  if (!addresses.length || addresses.some(({ address }) => unsafeAddress(address))) {
    throw new Error("INVALID_INPUT");
  }
  return normalized;
}

export async function validateBrowserPushInput(
  value: BrowserPushSubscriptionInput,
) {
  if (
    !value || typeof value !== "object" ||
    typeof value.endpoint !== "string" ||
    typeof value.p256dh !== "string" ||
    typeof value.auth !== "string" ||
    base64UrlBytes(value.p256dh) !== 65 ||
    base64UrlBytes(value.auth) !== 16
  ) throw new Error("INVALID_INPUT");
  return { ...value, endpoint: await assertSafePushEndpoint(value.endpoint) };
}

export function isSupportedPushLocale(value: string) {
  return supportedLocales.has(value);
}
