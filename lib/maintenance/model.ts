export const maintenanceServiceCodes = [
  "panel-cleaning",
  "grounds-care",
  "technical-maintenance",
] as const;

export const maintenanceLocales = ["bg", "en", "tr", "uk"] as const;
export const MAINTENANCE_PRICE_LABEL_MAX_LENGTH = 200;

export type MaintenanceServiceCode =
  (typeof maintenanceServiceCodes)[number];
export type MaintenanceLocale = (typeof maintenanceLocales)[number];
export type MaintenancePriceLabels = Record<MaintenanceLocale, string | null>;

export type MaintenanceServiceInput = {
  code: MaintenanceServiceCode;
  isActive: boolean;
  oneTimeAvailable: boolean;
  periodicAvailable: boolean;
  oneTimePriceLabels: MaintenancePriceLabels;
  periodicPriceLabels: MaintenancePriceLabels;
};

export type ManagedMaintenanceService = MaintenanceServiceInput & {
  updatedAt: string;
};

export type ManagedMaintenanceServices = {
  canManage: boolean;
  services: ManagedMaintenanceService[];
};

export type PublicMaintenanceFrequency = {
  available: boolean;
  priceLabel: string | null;
};

export type PublicMaintenanceService = {
  code: MaintenanceServiceCode;
  oneTime: PublicMaintenanceFrequency;
  periodic: PublicMaintenanceFrequency;
};

export function isMaintenanceServiceCode(
  value: unknown,
): value is MaintenanceServiceCode {
  return (
    typeof value === "string" &&
    (maintenanceServiceCodes as readonly string[]).includes(value)
  );
}

export function isMaintenanceLocale(value: unknown): value is MaintenanceLocale {
  return (
    typeof value === "string" &&
    (maintenanceLocales as readonly string[]).includes(value)
  );
}
