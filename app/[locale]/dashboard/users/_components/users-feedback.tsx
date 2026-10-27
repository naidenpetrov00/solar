import type { RefObject } from "react";
import type {
  ManagedUser,
  ManagedUserAction,
} from "@/lib/user-management-model";
import type { UserActionResult } from "../user-action-model";

export const initialUserActionResult: UserActionResult = { status: "idle" };

type ConfirmationLabels = {
  title: string;
  description: string;
  confirm: string;
};

export type UsersWorkspaceLabels = {
  selectUser: string;
  noSelectionTitle: string;
  noSelectionDescription: string;
  backToUsers: string;
  details: string;
  name: string;
  email: string;
  role: string;
  verification: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  roles: Record<ManagedUser["role"], string>;
  verificationStates: Record<"verified" | "unverified", string>;
  accountStates: Record<"active" | "blocked", string>;
  actionsTitle: string;
  actions: Record<ManagedUserAction, string>;
  confirmations: Record<ManagedUserAction, ConfirmationLabels>;
  cancel: string;
  working: string;
  invite: {
    open: string;
    title: string;
    description: string;
    name: string;
    email: string;
    language: string;
    submit: string;
    submitting: string;
  };
  localeNames: Record<string, string>;
  results: Record<NonNullable<UserActionResult["code"]>, string>;
};

export function ResultMessage({
  result,
  labels,
  focusRef,
}: {
  result: UserActionResult;
  labels: UsersWorkspaceLabels;
  focusRef?: RefObject<HTMLParagraphElement | null>;
}) {
  if (!result.code || result.status === "idle") return null;

  return (
    <p
      ref={focusRef}
      className="dashboard-users-result"
      data-tone={result.status}
      role={result.status === "error" ? "alert" : "status"}
      aria-live={result.status === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      tabIndex={result.status === "error" ? -1 : undefined}
    >
      {labels.results[result.code]}
    </p>
  );
}
