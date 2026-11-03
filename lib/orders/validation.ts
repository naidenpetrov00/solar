import "server-only";

import { isCatalogLocale, isUuid } from "@/lib/catalog/model";
import {
  normalizeCustomerName,
  validateCustomerName,
  validateEmail,
} from "@/lib/auth-validation";
import { OrderError } from "@/lib/orders/errors";
import {
  isOrderPaymentMethod,
  maximumOrderItemQuantity,
  maximumOrderItems,
} from "@/lib/orders/model";
import type {
  GuestOrderInput,
  ManualAdjustmentInput,
  OrderCustomerInput,
} from "@/lib/orders/types";

function normalizedText(
  value: string,
  minimum: number,
  maximum: number,
  field: string,
) {
  const normalized = value.trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < minimum || length > maximum) {
    throw new OrderError("INVALID_INPUT", { field });
  }
  return normalized;
}

export function normalizeOrderSearchText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function normalizeOrderPhoneSearch(value: string) {
  const digits = value.replace(/\D/gu, "");
  return digits ? `${value.trim().startsWith("+") ? "+" : ""}${digits}` : "";
}

export function normalizeOrderCustomer(input: OrderCustomerInput) {
  const name = normalizeCustomerName(input.name);
  const email = input.email.trim();
  const phone = input.phone.trim().replace(/\s+/gu, " ");
  const phoneDigits = phone.replace(/\D/gu, "");
  if (validateCustomerName(name)) {
    throw new OrderError("INVALID_INPUT", { field: "name" });
  }
  if (validateEmail(email)) {
    throw new OrderError("INVALID_INPUT", { field: "email" });
  }
  if (!/^\+?[0-9().\-\s]+$/u.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 20) {
    throw new OrderError("INVALID_INPUT", { field: "phone" });
  }
  const phoneNormalized = `${phone.startsWith("+") ? "+" : ""}${phoneDigits}`;
  const city = normalizedText(input.city, 2, 120, "city");
  const deliveryAddress = normalizedText(input.deliveryAddress, 5, 500, "deliveryAddress");
  const note = input.note?.trim();
  return {
    name,
    nameNormalized: normalizeOrderSearchText(name),
    phone,
    phoneNormalized,
    email,
    emailNormalized: email.toLocaleLowerCase("en-US"),
    city,
    cityNormalized: city.toLocaleLowerCase("en-US"),
    deliveryAddress,
    deliveryAddressNormalized: normalizeOrderSearchText(deliveryAddress),
    note: note ? normalizedText(note, 1, 2000, "note") : null,
  };
}

export function normalizeGuestOrderInput(input: GuestOrderInput) {
  if (!isUuid(input.submissionKey) || !isCatalogLocale(input.locale)) {
    throw new OrderError("INVALID_INPUT", { field: "order" });
  }
  if (!isOrderPaymentMethod(input.paymentMethod)) {
    throw new OrderError("INVALID_INPUT", { field: "paymentMethod" });
  }
  if (input.items.length < 1 || input.items.length > maximumOrderItems) {
    throw new OrderError("INVALID_INPUT", { field: "items" });
  }
  const productIds = new Set<string>();
  const items = input.items.map((item) => {
    if (
      !isUuid(item.productId) ||
      productIds.has(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > maximumOrderItemQuantity
    ) {
      throw new OrderError("INVALID_INPUT", { field: "items" });
    }
    productIds.add(item.productId);
    return item;
  });
  return {
    ...input,
    customer: normalizeOrderCustomer(input.customer),
    items,
  };
}

export function normalizeAdjustments(values: ManualAdjustmentInput[]) {
  const keys = new Set<string>();
  return values.map((value) => {
    if (
      value.amountGrossMinor === BigInt(0) ||
      (value.adjustmentKey !== undefined &&
        (!isUuid(value.adjustmentKey) || keys.has(value.adjustmentKey)))
    ) {
      throw new OrderError("INVALID_INPUT");
    }
    if (value.adjustmentKey !== undefined) keys.add(value.adjustmentKey);
    return { ...value, reason: normalizedText(value.reason, 1, 500, "reason") };
  });
}
