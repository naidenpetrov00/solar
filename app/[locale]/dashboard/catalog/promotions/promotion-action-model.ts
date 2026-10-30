export type PromotionActionCode =
  | "CREATED"
  | "SAVED"
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STALE";

export type PromotionActionResult = {
  status: "idle" | "success" | "error";
  code?: PromotionActionCode;
  targetId?: string;
  updatedAt?: string;
  fieldErrors?: Record<string, string>;
};

export const idlePromotionActionResult: PromotionActionResult = {
  status: "idle",
};
