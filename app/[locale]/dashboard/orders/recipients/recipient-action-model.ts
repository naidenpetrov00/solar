export type RecipientActionCode =
  | "CREATED"
  | "UPDATED"
  | "ACTIVATED"
  | "DEACTIVATED"
  | "DUPLICATE_ACTIVE_EMAIL"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STALE"
  | "TEMPORARY_FAILURE";

export type RecipientActionResult = {
  status: "idle" | "success" | "error";
  code?: RecipientActionCode;
  targetId?: string;
  mutationVersion?: number;
  fieldErrors?: Record<string, "REQUIRED" | "INVALID">;
};

export const initialRecipientActionResult: RecipientActionResult = {
  status: "idle",
};
