export type InAppNotificationErrorCode =
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INVALID_STORED_NOTIFICATION"
  | "NOT_FOUND";

export class InAppNotificationError extends Error {
  constructor(readonly code: InAppNotificationErrorCode) {
    super(code);
    this.name = "InAppNotificationError";
  }
}
