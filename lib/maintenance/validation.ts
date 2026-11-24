import {
  isMaintenancePriceableServiceCode,
  isMaintenanceServiceCode,
  type MaintenanceServiceInput,
} from "@/lib/maintenance/model";

const MAXIMUM_PRICE_CENTS = BigInt("9223372036854775807");
export const MAINTENANCE_PRICE_INPUT_MAX_LENGTH = 20;

export type MaintenanceFieldErrorCode = "INVALID" | "REQUIRED";

export type RawMaintenanceServiceInput = {
  code: unknown;
  isActive: boolean;
  oneTimeAvailable: boolean;
  periodicAvailable: boolean;
  oneTimePrice: string;
  periodicPrice: string;
};

export type MaintenanceValidationResult =
  | { success: true; data: MaintenanceServiceInput }
  | {
      success: false;
      fieldErrors: Record<string, MaintenanceFieldErrorCode>;
    };

function parsePositiveEuroCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (
    normalized.length > MAINTENANCE_PRICE_INPUT_MAX_LENGTH ||
    !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)
  ) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");
  const cents =
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return cents > BigInt(0) && cents <= MAXIMUM_PRICE_CENTS ? cents : null;
}

function validatePrice(
  available: boolean,
  rawValue: string,
  field: "oneTimePrice" | "periodicPrice",
  errors: Record<string, MaintenanceFieldErrorCode>,
) {
  if (!available) return null;
  if (!rawValue.trim()) {
    errors[field] = "REQUIRED";
    return null;
  }

  const cents = parsePositiveEuroCents(rawValue);
  if (cents === null) errors[field] = "INVALID";
  return cents;
}

export function euroCentsToInput(value: string | null) {
  if (value === null) return "";
  const cents = BigInt(value);
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}

export function validateMaintenanceServiceInput(
  input: RawMaintenanceServiceInput,
): MaintenanceValidationResult {
  const fieldErrors: Record<string, MaintenanceFieldErrorCode> = {};
  if (!isMaintenanceServiceCode(input.code)) {
    return { success: false, fieldErrors: { code: "INVALID" } };
  }

  if (input.isActive && !input.oneTimeAvailable && !input.periodicAvailable) {
    fieldErrors.frequency = "REQUIRED";
  }

  const priceable = isMaintenancePriceableServiceCode(input.code);
  const oneTimePriceCents = priceable
    ? validatePrice(
        input.oneTimeAvailable,
        input.oneTimePrice,
        "oneTimePrice",
        fieldErrors,
      )
    : null;
  const periodicPriceCents = priceable
    ? validatePrice(
        input.periodicAvailable,
        input.periodicPrice,
        "periodicPrice",
        fieldErrors,
      )
    : null;

  if (Object.keys(fieldErrors).length) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      code: input.code,
      isActive: input.isActive,
      oneTimeAvailable: input.oneTimeAvailable,
      periodicAvailable: input.periodicAvailable,
      oneTimePriceCents,
      periodicPriceCents,
    },
  };
}
