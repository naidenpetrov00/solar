import "server-only";

import { lookup } from "node:dns";
import { Agent } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

import type { BrowserPushSubscriptionInput } from "@/lib/web-push/model";

const supportedLocales = new Set(["bg", "en", "tr", "uk"]);
const unsafeAddresses = new BlockList();
const publicIpv6Addresses = new BlockList();

const unsafeIpv4Subnets = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const;

for (const [network, prefix] of unsafeIpv4Subnets) {
  unsafeAddresses.addSubnet(network, prefix, "ipv4");
  const octets = network.split(".").map(Number);
  const embeddedIpv4 = `${((octets[0] << 8) | octets[1]).toString(16)}:${
    ((octets[2] << 8) | octets[3]).toString(16)
  }`;
  unsafeAddresses.addSubnet(`64:ff9b::${embeddedIpv4}`, 96 + prefix, "ipv6");
  unsafeAddresses.addSubnet(`::ffff:${embeddedIpv4}`, 96 + prefix, "ipv6");
}

for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b:1::", 48], ["100::", 64],
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
  ["5f00::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const) unsafeAddresses.addSubnet(network, prefix, "ipv6");

publicIpv6Addresses.addSubnet("2000::", 3, "ipv6");
publicIpv6Addresses.addSubnet("64:ff9b::", 96, "ipv6");
publicIpv6Addresses.addSubnet("::ffff:0:0", 96, "ipv6");

export class UnsafePushEndpointError extends Error {
  readonly code = "UNSAFE_PUSH_ENDPOINT";

  constructor() {
    super("Push endpoint resolved to an unsafe address.");
    this.name = "UnsafePushEndpointError";
  }
}

function base64UrlBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return -1;
  try {
    return Buffer.from(value, "base64url").byteLength;
  } catch {
    return -1;
  }
}

function isUnsafeAddress(address: string) {
  const family = isIP(address);
  if (family === 0) return true;
  const type = family === 6 ? "ipv6" : "ipv4";
  if (unsafeAddresses.check(address, type)) return true;
  return family === 6 && !publicIpv6Addresses.check(address, "ipv6");
}

const guardedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, {
    family: options.family,
    hints: options.hints,
    all: true,
    order: "verbatim",
  }, (error, addresses) => {
    if (error) {
      callback(error, "", 0);
      return;
    }
    if (!addresses.length) {
      const noAddress = new Error("Push endpoint did not resolve.") as NodeJS.ErrnoException;
      noAddress.code = "ENOTFOUND";
      callback(noAddress, "", 0);
      return;
    }
    if (addresses.some(({ address }) => isUnsafeAddress(address))) {
      callback(new UnsafePushEndpointError(), "", 0);
      return;
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
};

export function createSafePushAgent() {
  return new Agent({ keepAlive: false, lookup: guardedLookup });
}

export function normalizePushEndpoint(endpoint: string) {
  if (typeof endpoint !== "string" || endpoint.length < 12 || endpoint.length > 2048) {
    throw new Error("INVALID_INPUT");
  }
  let url: URL;
  try { url = new URL(endpoint); }
  catch { throw new Error("INVALID_INPUT"); }
  const hostname = url.hostname.replace(/^\[|\]$/gu, "");
  if (
    url.protocol !== "https:" || url.username || url.password ||
    (url.port && url.port !== "443") || isIP(hostname) ||
    hostname === "localhost" || url.hash
  ) throw new Error("INVALID_INPUT");
  return url.toString();
}

export async function assertSafePushEndpoint(endpoint: string) {
  const normalized = normalizePushEndpoint(endpoint);
  const url = new URL(normalized);
  try {
    await new Promise<void>((resolve, reject) => {
      guardedLookup(url.hostname, { all: true }, (error, result) => {
        if (error) reject(error);
        else if (Array.isArray(result) && result.length) resolve();
        else reject(new Error("TEMPORARY_FAILURE"));
      });
    });
  } catch (error) {
    if (error instanceof UnsafePushEndpointError) throw new Error("INVALID_INPUT");
    throw new Error("TEMPORARY_FAILURE");
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
