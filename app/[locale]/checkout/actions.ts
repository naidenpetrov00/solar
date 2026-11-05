"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/authorization";
import { createCheckoutOrder } from "@/lib/orders/create-order";
import {
  assertOrderConfirmationConfiguration,
  createOrderConfirmationToken,
  orderConfirmationCookieName,
  orderConfirmationMaxAgeSeconds,
} from "@/lib/orders/confirmation-token";
import { OrderError } from "@/lib/orders/errors";
import { scheduleOrderNotificationDispatch } from "@/lib/order-notifications/after-kick";
import type { CheckoutOrderInput } from "@/lib/orders/types";
import { assertCustomerPolicyReadiness } from "@/lib/legal/policy-facts";
import { localizedPath } from "../_lib/routes";
import type {
  CheckoutActionResult,
  CheckoutField,
} from "./checkout-action-model";

function text(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function inputFrom(data: FormData): CheckoutOrderInput | null {
  const productIds = data.getAll("productId");
  const quantities = data.getAll("quantity");
  if (
    !productIds.length ||
    productIds.length !== quantities.length ||
    productIds.some((value) => typeof value !== "string") ||
    quantities.some((value) => typeof value !== "string" || !/^[0-9]+$/u.test(value))
  ) return null;
  return {
    submissionKey: text(data, "submissionKey"),
    locale: text(data, "locale") as CheckoutOrderInput["locale"],
    customer: {
      name: text(data, "name"),
      phone: text(data, "phone"),
      email: text(data, "email"),
      city: text(data, "city"),
      deliveryAddress: text(data, "deliveryAddress"),
      note: text(data, "note"),
    },
    paymentMethod: text(data, "paymentMethod") as CheckoutOrderInput["paymentMethod"],
    items: productIds.map((productId, index) => ({
      productId: productId as string,
      quantity: Number(quantities[index]),
    })),
  };
}

function invalidField(error: OrderError): CheckoutField | null {
  if (!error.details || typeof error.details !== "object" || !("field" in error.details)) return null;
  const field = error.details.field;
  return typeof field === "string" && [
    "name", "phone", "email", "city", "deliveryAddress", "note", "paymentMethod",
  ].includes(field) ? field as CheckoutField : null;
}

export async function submitCheckoutOrderAction(
  _previous: CheckoutActionResult,
  data: FormData,
): Promise<CheckoutActionResult> {
  assertCustomerPolicyReadiness();
  assertOrderConfirmationConfiguration();
  if (text(data, "privacyAcknowledged") !== "true") {
    return { status: "invalid", fieldErrors: { privacyAcknowledged: "REQUIRED" } };
  }
  const input = inputFrom(data);
  if (!input) return { status: "cart_stale" };
  try {
    const currentUser = await getCurrentUser();
    const created = await createCheckoutOrder(
      input,
      currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
          }
        : null,
    );
    scheduleOrderNotificationDispatch();
    const cookieStore = await cookies();
    cookieStore.set(orderConfirmationCookieName, createOrderConfirmationToken(created.orderNumber), {
      httpOnly: true,
      maxAge: orderConfirmationMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return {
      status: "success",
      confirmationHref: localizedPath(input.locale, "checkout/confirmation"),
      submissionKey: input.submissionKey,
    };
  } catch (error) {
    if (!(error instanceof OrderError)) return { status: "temporary_failure" };
    if (error.code === "CONFLICT") return { status: "possible_duplicate" };
    if (error.code === "INVALID_INPUT") {
      const field = invalidField(error);
      return field
        ? { status: "invalid", fieldErrors: { [field]: "INVALID" } }
        : { status: "cart_stale" };
    }
    return { status: "temporary_failure" };
  }
}
