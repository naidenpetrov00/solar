import "server-only";

import {
  normalizeCustomerName,
  validateCustomerName,
  validateEmail,
} from "@/lib/auth-validation";
import { OrderNotificationError } from "@/lib/order-notifications/errors";

export function normalizeNotificationRecipient(input: {
  name: string;
  email: string;
}) {
  const name = normalizeCustomerName(input.name);
  const email = input.email.trim();
  if (validateCustomerName(name)) {
    throw new OrderNotificationError("INVALID_INPUT", { field: "name" });
  }
  if (validateEmail(email)) {
    throw new OrderNotificationError("INVALID_INPUT", { field: "email" });
  }
  return {
    name,
    email,
    emailNormalized: email.toLocaleLowerCase("en-US"),
  };
}
