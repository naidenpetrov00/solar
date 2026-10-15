export const CUSTOMER_NAME_MIN_LENGTH = 2;
export const CUSTOMER_NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type CustomerNameValidationError = "required" | "length";
export type EmailValidationError = "required" | "invalid";
export type PasswordValidationError = "required" | "length";

export function normalizeCustomerName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function validateCustomerName(
  value: string,
): CustomerNameValidationError | null {
  if (!value) {
    return "required";
  }

  const length = Array.from(value).length;
  return length < CUSTOMER_NAME_MIN_LENGTH || length > CUSTOMER_NAME_MAX_LENGTH
    ? "length"
    : null;
}

export function validateEmail(value: string): EmailValidationError | null {
  if (!value) {
    return "required";
  }

  return value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
    ? "invalid"
    : null;
}

export function validateNewPassword(
  value: string,
): PasswordValidationError | null {
  if (!value) {
    return "required";
  }

  return value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH
    ? "length"
    : null;
}
