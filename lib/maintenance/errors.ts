export type MaintenanceErrorCode =
  | "FORBIDDEN"
  | "INCOMPLETE_FIXED_SET"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STALE";

export class MaintenanceError extends Error {
  constructor(
    readonly code: MaintenanceErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = "MaintenanceError";
  }
}
