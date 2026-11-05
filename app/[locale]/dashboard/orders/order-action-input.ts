import { isUuid } from "@/lib/catalog/model";
import { parsePositiveEuroMinor } from "@/lib/orders/decimal-money";
import {
  isOrderPaymentMethod,
  maximumOrderItemQuantity,
  maximumOrderItems,
} from "@/lib/orders/model";
import type {
  ManualAdjustmentInput,
  ReviseOrderInput,
} from "@/lib/orders/types";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function string(value: unknown) {
  return typeof value === "string" ? value : "";
}

function adjustments(
  value: unknown,
  prefix: string,
  fieldErrors: Record<string, "REQUIRED" | "INVALID">,
): ManualAdjustmentInput[] | null {
  if (!Array.isArray(value)) return null;
  const result: ManualAdjustmentInput[] = [];
  for (const [index, entry] of value.entries()) {
    const row = object(entry);
    if (!row) return null;
    const direction = string(row.direction);
    const amount = parsePositiveEuroMinor(string(row.amount));
    const reason = string(row.reason).trim();
    const key = string(row.adjustmentKey);
    if (direction !== "discount" && direction !== "surcharge") {
      fieldErrors[`${prefix}.${index}.direction`] = "INVALID";
    }
    if (amount === null) fieldErrors[`${prefix}.${index}.amount`] = "INVALID";
    if (!reason) fieldErrors[`${prefix}.${index}.reason`] = "REQUIRED";
    if (reason.length > 500) fieldErrors[`${prefix}.${index}.reason`] = "INVALID";
    if (key && !isUuid(key)) fieldErrors[`${prefix}.${index}.key`] = "INVALID";
    if (amount && reason && (direction === "discount" || direction === "surcharge")) {
      result.push({
        ...(key ? { adjustmentKey: key } : {}),
        amountGrossMinor: direction === "discount" ? -amount : amount,
        reason,
      });
    }
  }
  return result;
}

export function parseRevisionPayload(input: {
  actorId: string;
  orderId: string;
  expectedVersion: number;
  payload: string;
}) {
  const fieldErrors: Record<string, "REQUIRED" | "INVALID"> = {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.payload);
  } catch {
    return { fieldErrors: { order: "INVALID" } as const, value: null };
  }
  const root = object(parsed);
  const customer = object(root?.customer);
  const lines = root?.lines;
  const orderAdjustments = adjustments(
    root?.orderAdjustments,
    "orderAdjustments",
    fieldErrors,
  );
  if (!root || !customer || !Array.isArray(lines) || orderAdjustments === null) {
    return { fieldErrors: { order: "INVALID" } as const, value: null };
  }
  const paymentMethod = string(root.paymentMethod);
  const validPaymentMethod = isOrderPaymentMethod(paymentMethod) ? paymentMethod : null;
  if (!validPaymentMethod) fieldErrors.paymentMethod = "INVALID";
  if (lines.length < 1 || lines.length > maximumOrderItems) fieldErrors.lines = "INVALID";
  const parsedLines: ReviseOrderInput["lines"] = [];
  for (const [index, entry] of lines.entries()) {
    const row = object(entry);
    if (!row) {
      fieldErrors[`lines.${index}`] = "INVALID";
      continue;
    }
    const lineKey = string(row.lineKey);
    const productId = string(row.productId);
    const quantity = Number(row.quantity);
    const lineAdjustments = adjustments(
      row.adjustments,
      `lines.${index}.adjustments`,
      fieldErrors,
    );
    if (
      (!lineKey && !productId) ||
      (lineKey && productId) ||
      (lineKey && !isUuid(lineKey)) ||
      (productId && !isUuid(productId))
    ) fieldErrors[`lines.${index}.product`] = "INVALID";
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maximumOrderItemQuantity
    ) fieldErrors[`lines.${index}.quantity`] = "INVALID";
    if (lineAdjustments === null) fieldErrors[`lines.${index}.adjustments`] = "INVALID";
    if (
      !fieldErrors[`lines.${index}.product`] &&
      !fieldErrors[`lines.${index}.quantity`] &&
      lineAdjustments
    ) {
      parsedLines.push(lineKey
        ? { lineKey, quantity, adjustments: lineAdjustments }
        : { productId, quantity, adjustments: lineAdjustments });
    }
  }
  const name = string(customer.name);
  const phone = string(customer.phone);
  const email = string(customer.email);
  const city = string(customer.city);
  const deliveryAddress = string(customer.deliveryAddress);
  for (const [field, value] of Object.entries({ name, phone, email, city, deliveryAddress })) {
    if (!value.trim()) fieldErrors[field] = "REQUIRED";
  }
  if (Object.keys(fieldErrors).length || !validPaymentMethod) {
    return { fieldErrors, value: null };
  }
  return {
    fieldErrors,
    value: {
      actorId: input.actorId,
      orderId: input.orderId,
      expectedVersion: input.expectedVersion,
      customer: {
        name,
        phone,
        email,
        city,
        deliveryAddress,
        note: string(customer.note),
      },
      paymentMethod: validPaymentMethod,
      lines: parsedLines,
      orderAdjustments,
    } satisfies ReviseOrderInput,
  };
}
