"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/authorization";
import { isUuid } from "@/lib/catalog/model";
import { OrderError } from "@/lib/orders/errors";
import { searchEligibleOrderProducts } from "@/lib/orders/management-products";
import { reviseOrder } from "@/lib/orders/revise-order";
import { transitionOrderStatus } from "@/lib/orders/transition-order";
import { transitionPaymentStatus } from "@/lib/orders/transition-payment";
import { isOrderPaymentStatus, isOrderStatus } from "@/lib/orders/model";
import { AuthorizationError } from "@/lib/permission-policy";
import {
  dashboardOrderRouteSlug,
  dashboardOrdersRouteSlug,
  localizedPath,
  supportedLocales,
} from "../../_lib/routes";
import { parseRevisionPayload } from "./order-action-input";
import type {
  OrderActionCode,
  OrderActionResult,
  ProductSearchResult,
} from "./order-action-model";

function text(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function version(data: FormData) {
  const value = Number(text(data, "expectedVersion"));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function actionError(error: unknown): OrderActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN" };
  }
  if (!(error instanceof OrderError)) {
    return { status: "error", code: "TEMPORARY_FAILURE" };
  }
  const supported: OrderActionCode[] = [
    "FORBIDDEN",
    "INVALID_INPUT",
    "NOT_FOUND",
    "STALE",
    "ORDER_NOT_EDITABLE",
    "INVALID_STATUS_TRANSITION",
    "INVALID_PAYMENT_TRANSITION",
  ];
  return {
    status: "error",
    code: supported.includes(error.code as OrderActionCode)
      ? error.code as OrderActionCode
      : "INVALID_INPUT",
  };
}

function revalidateOrder(locale: string, orderId: string) {
  if (!(supportedLocales as readonly string[]).includes(locale)) return;
  revalidatePath(localizedPath(locale, dashboardOrdersRouteSlug));
  revalidatePath(localizedPath(locale, dashboardOrderRouteSlug(orderId)));
}

export async function saveOrderAction(
  _previous: OrderActionResult,
  data: FormData,
): Promise<OrderActionResult> {
  const orderId = text(data, "orderId");
  const expectedVersion = version(data);
  if (!isUuid(orderId) || expectedVersion === null) {
    return { status: "error", code: "INVALID_INPUT" };
  }
  try {
    const actor = await requireUser();
    const parsed = parseRevisionPayload({
      actorId: actor.id,
      orderId,
      expectedVersion,
      payload: text(data, "payload"),
    });
    if (!parsed.value) {
      return {
        status: "error",
        code: "INVALID_INPUT",
        fieldErrors: parsed.fieldErrors,
      };
    }
    const result = await reviseOrder(parsed.value);
    revalidateOrder(text(data, "dashboardLocale"), orderId);
    return { status: "success", code: "SAVED", mutationVersion: result.mutationVersion };
  } catch (error) {
    const result = actionError(error);
    if (
      error instanceof OrderError &&
      error.code === "INVALID_INPUT" &&
      error.details &&
      typeof error.details === "object" &&
      "field" in error.details &&
      typeof error.details.field === "string"
    ) {
      return { ...result, fieldErrors: { [error.details.field]: "INVALID" } };
    }
    return result;
  }
}

export async function transitionOrderAction(
  _previous: OrderActionResult,
  data: FormData,
): Promise<OrderActionResult> {
  const orderId = text(data, "orderId");
  const expectedVersion = version(data);
  const status = text(data, "status");
  if (!isUuid(orderId) || expectedVersion === null || !isOrderStatus(status)) {
    return { status: "error", code: "INVALID_INPUT" };
  }
  try {
    const actor = await requireUser();
    const result = await transitionOrderStatus({
      actorId: actor.id,
      orderId,
      expectedVersion,
      status,
    });
    revalidateOrder(text(data, "dashboardLocale"), orderId);
    return {
      status: "success",
      code: "ORDER_STATUS_UPDATED",
      mutationVersion: result.mutationVersion,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function transitionPaymentAction(
  _previous: OrderActionResult,
  data: FormData,
): Promise<OrderActionResult> {
  const orderId = text(data, "orderId");
  const expectedVersion = version(data);
  const paymentStatus = text(data, "paymentStatus");
  if (
    !isUuid(orderId) ||
    expectedVersion === null ||
    !isOrderPaymentStatus(paymentStatus)
  ) return { status: "error", code: "INVALID_INPUT" };
  try {
    const actor = await requireUser();
    const result = await transitionPaymentStatus({
      actorId: actor.id,
      orderId,
      expectedVersion,
      paymentStatus,
    });
    revalidateOrder(text(data, "dashboardLocale"), orderId);
    return {
      status: "success",
      code: "PAYMENT_STATUS_UPDATED",
      mutationVersion: result.mutationVersion,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function searchOrderProductsAction(input: {
  orderId: string;
  query: string;
  excludedIds: string[];
}): Promise<ProductSearchResult> {
  try {
    const actor = await requireUser();
    const products = await searchEligibleOrderProducts(
      actor.id,
      input.orderId,
      input.query,
      input.excludedIds,
    );
    return { status: "success", products };
  } catch (error) {
    const result = actionError(error);
    return { status: "error", code: result.code ?? "TEMPORARY_FAILURE" };
  }
}
