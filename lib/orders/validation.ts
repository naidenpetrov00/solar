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

function normalizedText(value: string, minimum: number, maximum: number) {
  const normalized = value.trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < minimum || length > maximum) {
    throw new OrderError("INVALID_INPUT");
  }
  return normalized;
}

function technicalNormalization(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function normalizeOrderCustomer(input: OrderCustomerInput) {
  const name = normalizeCustomerName(input.name);
  const email = input.email.trim();
  const phone = input.phone.trim().replace(/\s+/gu, " ");
  const phoneDigits = phone.replace(/\D/gu, "");
  if (
    validateCustomerName(name) ||
    validateEmail(email) ||
    !/^\+?[0-9().\-\s]+$/u.test(phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 20
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  const phoneNormalized = `${phone.startsWith("+") ? "+" : ""}${phoneDigits}`;
  const city = normalizedText(input.city, 2, 120);
  const deliveryAddress = normalizedText(input.deliveryAddress, 5, 500);
  const note = input.note?.trim();
  return {
    name,
    nameNormalized: technicalNormalization(name),
    phone,
    phoneNormalized,
    email,
    emailNormalized: email.toLocaleLowerCase("en-US"),
    city,
    cityNormalized: city.toLocaleLowerCase("en-US"),
    deliveryAddress,
    deliveryAddressNormalized: technicalNormalization(deliveryAddress),
    note: note ? normalizedText(note, 1, 2000) : null,
  };
}

export function normalizeGuestOrderInput(input: GuestOrderInput) {
  if (
    !isUuid(input.submissionKey) ||
    !isCatalogLocale(input.locale) ||
    !isOrderPaymentMethod(input.paymentMethod) ||
    input.items.length < 1 ||
    input.items.length > maximumOrderItems
  ) {
    throw new OrderError("INVALID_INPUT");
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
      throw new OrderError("INVALID_INPUT");
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
    return { ...value, reason: normalizedText(value.reason, 1, 500) };
  });
}
