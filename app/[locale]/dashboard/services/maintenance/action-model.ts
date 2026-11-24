import type { MaintenanceFieldErrorCode } from "@/lib/maintenance/validation";

export type MaintenanceActionCode =
  | "FORBIDDEN"
  | "INCOMPLETE_FIXED_SET"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "SAVED"
  | "STALE";

export type MaintenanceActionResult = {
  status: "idle" | "success" | "error";
  code?: MaintenanceActionCode;
  updatedAt?: string;
  fieldErrors?: Record<string, MaintenanceFieldErrorCode>;
};

export const idleMaintenanceActionResult: MaintenanceActionResult = {
  status: "idle",
};
