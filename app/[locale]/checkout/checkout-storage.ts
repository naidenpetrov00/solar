"use client";

import type { CartItem } from "../_components/cart-store";

export type CheckoutDraft = {
  name: string;
  phone: string;
  email: string;
  city: string;
  deliveryAddress: string;
  note: string;
  paymentMethod: "cash_on_delivery" | "bank_transfer" | "arranged_by_phone";
  privacyAcknowledged: boolean;
};

export const emptyCheckoutDraft: CheckoutDraft = {
  name: "",
  phone: "",
  email: "",
  city: "",
  deliveryAddress: "",
  note: "",
  paymentMethod: "cash_on_delivery",
  privacyAcknowledged: false,
};

const draftKey = "solar-checkout-draft:v1";
const attemptKey = "solar-checkout-attempt:v1";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function randomUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cartSignature(items: CartItem[]) {
  return items
    .map(({ id, quantity }) => `${id}:${quantity}`)
    .sort()
    .join("|");
}

export function loadCheckoutDraft() {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
    if (!value || typeof value !== "object") return emptyCheckoutDraft;
    return { ...emptyCheckoutDraft, ...value } as CheckoutDraft;
  } catch {
    return emptyCheckoutDraft;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* tab storage is optional */ }
}

export function checkoutSubmissionKey(items: CartItem[]) {
  const signature = cartSignature(items);
  try {
    const value: unknown = JSON.parse(localStorage.getItem(attemptKey) ?? "null");
    if (
      value && typeof value === "object" &&
      "signature" in value && value.signature === signature &&
      "submissionKey" in value && typeof value.submissionKey === "string" && uuidPattern.test(value.submissionKey)
    ) return value.submissionKey;
    const submissionKey = randomUuid();
    localStorage.setItem(attemptKey, JSON.stringify({ signature, submissionKey }));
    return submissionKey;
  } catch {
    return randomUuid();
  }
}

export function clearCheckoutStorage(submissionKey: string) {
  try {
    sessionStorage.removeItem(draftKey);
    const value: unknown = JSON.parse(localStorage.getItem(attemptKey) ?? "null");
    if (value && typeof value === "object" && "submissionKey" in value && value.submissionKey === submissionKey) {
      localStorage.removeItem(attemptKey);
    }
  } catch { /* successful order remains authoritative */ }
}
