import "server-only";

import {
  normalizeCustomerName,
  validateCustomerName,
  validateEmail,
} from "@/lib/auth-validation";

export type UsableOrderNotificationUser = {
  name: string;
  email: string;
  emailNormalized: string;
};

export function usableOrderNotificationUser(input: {
  name: string;
  email: string;
}): UsableOrderNotificationUser | null {
  const name = normalizeCustomerName(input.name);
  const email = input.email.trim();

  if (validateCustomerName(name) || validateEmail(email)) {
    return null;
  }

  return {
    name,
    email,
    emailNormalized: email.toLocaleLowerCase("en-US"),
  };
}
