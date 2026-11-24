export const maintenanceServiceCodes = [
  "panel-cleaning",
  "grounds-care",
  "technical-maintenance",
] as const;

export const maintenancePriceableServiceCodes = [
  "panel-cleaning",
  "grounds-care",
] as const;

export type MaintenanceServiceCode =
  (typeof maintenanceServiceCodes)[number];

export type MaintenanceServiceInput = {
  code: MaintenanceServiceCode;
  isActive: boolean;
  oneTimeAvailable: boolean;
  periodicAvailable: boolean;
  oneTimePriceCents: bigint | null;
  periodicPriceCents: bigint | null;
};

export type ManagedMaintenanceService = Omit<
  MaintenanceServiceInput,
  "oneTimePriceCents" | "periodicPriceCents"
> & {
  oneTimePriceCents: string | null;
  periodicPriceCents: string | null;
  updatedAt: string;
};

export type ManagedMaintenanceServices = {
  canManage: boolean;
  services: ManagedMaintenanceService[];
};

export type PublicMaintenanceFrequency = {
  available: boolean;
  amountCents: string | null;
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

export function isMaintenancePriceableServiceCode(
  value: MaintenanceServiceCode,
) {
  return (maintenancePriceableServiceCodes as readonly string[]).includes(
    value,
  );
}
