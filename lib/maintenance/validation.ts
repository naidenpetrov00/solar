import {
  MAINTENANCE_PRICE_LABEL_MAX_LENGTH,
  isMaintenanceServiceCode,
  maintenanceLocales,
  type MaintenanceLocale,
  type MaintenancePriceLabels,
  type MaintenanceServiceInput,
} from "@/lib/maintenance/model";

export type MaintenanceFieldErrorCode =
  | "INVALID"
  | "REQUIRED"
  | "TOO_LONG";

type RawMaintenanceServiceInput = Omit<
  MaintenanceServiceInput,
  "code" | "oneTimePriceLabels" | "periodicPriceLabels"
> & {
  code: unknown;
  oneTimePriceLabels: Record<MaintenanceLocale, string>;
  periodicPriceLabels: Record<MaintenanceLocale, string>;
};

export type MaintenanceValidationResult =
  | { success: true; data: MaintenanceServiceInput }
  | {
      success: false;
      fieldErrors: Record<string, MaintenanceFieldErrorCode>;
    };

function normalizeLabels(
  values: Record<MaintenanceLocale, string>,
  field: "oneTimePriceLabels" | "periodicPriceLabels",
  errors: Record<string, MaintenanceFieldErrorCode>,
): MaintenancePriceLabels {
  return Object.fromEntries(
    maintenanceLocales.map((locale) => {
      const value = values[locale].trim();
      if (value.length > MAINTENANCE_PRICE_LABEL_MAX_LENGTH) {
        errors[`${field}.${locale}`] = "TOO_LONG";
      }
      return [locale, value || null];
    }),
  ) as MaintenancePriceLabels;
}

export function validateMaintenanceServiceInput(
  input: RawMaintenanceServiceInput,
): MaintenanceValidationResult {
  const fieldErrors: Record<string, MaintenanceFieldErrorCode> = {};
  if (!isMaintenanceServiceCode(input.code)) fieldErrors.code = "INVALID";

  const oneTimePriceLabels = normalizeLabels(
    input.oneTimePriceLabels,
    "oneTimePriceLabels",
    fieldErrors,
  );
  const periodicPriceLabels = normalizeLabels(
    input.periodicPriceLabels,
    "periodicPriceLabels",
    fieldErrors,
  );

  if (input.isActive && !input.oneTimeAvailable && !input.periodicAvailable) {
    fieldErrors.frequency = "REQUIRED";
  }
  if (input.oneTimeAvailable && !oneTimePriceLabels.bg) {
    fieldErrors["oneTimePriceLabels.bg"] = "REQUIRED";
  }
  if (input.periodicAvailable && !periodicPriceLabels.bg) {
    fieldErrors["periodicPriceLabels.bg"] = "REQUIRED";
  }

  if (Object.keys(fieldErrors).length || !isMaintenanceServiceCode(input.code)) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      code: input.code,
      isActive: input.isActive,
      oneTimeAvailable: input.oneTimeAvailable,
      periodicAvailable: input.periodicAvailable,
      oneTimePriceLabels,
      periodicPriceLabels,
    },
  };
}
