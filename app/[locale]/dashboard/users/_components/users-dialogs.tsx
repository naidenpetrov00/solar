import { Button } from "@/components/button";
import type { RefObject } from "react";
import type {
  ManagedUser,
  ManagedUserAction,
} from "@/lib/user-management-model";
import type { UserActionResult } from "../user-action-model";
import type { UsersWorkspaceLabels } from "./users-feedback";
import { ResultMessage, initialUserActionResult } from "./users-feedback";
import { DashboardSelect } from "../../_components/dashboard-select";
import type { SupportedLocale } from "../../../_lib/routes";

export function UserConfirmationDialog({
  confirmationDialogRef,
  confirmation,
  managementAction,
  managementPending,
  managementResult,
  managementResultAtOpen,
  locale,
  labels,
  managementErrorRef,
  onClose,
}: {
  confirmationDialogRef: RefObject<HTMLDialogElement | null>;
  confirmation: { action: ManagedUserAction; user: ManagedUser } | null;
  managementAction: (formData: FormData) => void;
  managementPending: boolean;
  managementResult: UserActionResult;
  managementResultAtOpen: UserActionResult;
  locale: string;
  labels: UsersWorkspaceLabels;
  managementErrorRef: RefObject<HTMLParagraphElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={confirmationDialogRef}
      className="dashboard-users-dialog"
      aria-labelledby="dashboard-users-confirmation-title"
      aria-describedby="dashboard-users-confirmation-description"
      onClose={onClose}
    >
      {confirmation ? (
        <form action={managementAction} aria-busy={managementPending}>
          <input type="hidden" name="targetId" value={confirmation.user.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={confirmation.user.updatedAt}
          />
          <input type="hidden" name="intent" value={confirmation.action} />
          <input type="hidden" name="locale" value={locale} />
          <h2 id="dashboard-users-confirmation-title">
            {labels.confirmations[confirmation.action].title}
          </h2>
          <p id="dashboard-users-confirmation-description">
            {labels.confirmations[confirmation.action].description}
          </p>
          <p className="dashboard-users-dialog-account">
            <strong>{confirmation.user.name}</strong>
            <span>{confirmation.user.email}</span>
          </p>
          <ResultMessage
            result={
              managementResult === managementResultAtOpen
                ? initialUserActionResult
                : managementResult
            }
            labels={labels}
            focusRef={managementErrorRef}
          />
          <div className="dashboard-users-dialog-actions">
            <Button
              type="button"
              variant="secondary"
              autoFocus
              disabled={managementPending}
              onClick={() => confirmationDialogRef.current?.close()}
            >
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={managementPending}>
              {managementPending
                ? labels.working
                : labels.confirmations[confirmation.action].confirm}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

export function AdministratorInviteDialog({
  inviteDialogRef,
  inviteAction,
  invitePending,
  inviteResult,
  inviteResultAtOpen,
  locale,
  labels,
  inviteErrorRef,
  onClose,
}: {
  inviteDialogRef: RefObject<HTMLDialogElement | null>;
  inviteAction: (formData: FormData) => void;
  invitePending: boolean;
  inviteResult: UserActionResult;
  inviteResultAtOpen: UserActionResult;
  locale: string;
  labels: UsersWorkspaceLabels;
  inviteErrorRef: RefObject<HTMLParagraphElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={inviteDialogRef}
      className="dashboard-users-dialog dashboard-users-invite-dialog"
      aria-labelledby="dashboard-users-invite-title"
      aria-describedby="dashboard-users-invite-description"
      onClose={onClose}
    >
      <form action={inviteAction} aria-busy={invitePending}>
        <input type="hidden" name="dashboardLocale" value={locale} />
        <h2 id="dashboard-users-invite-title">{labels.invite.title}</h2>
        <p id="dashboard-users-invite-description">
          {labels.invite.description}
        </p>
        <ResultMessage
          result={
            inviteResult === inviteResultAtOpen
              ? initialUserActionResult
              : inviteResult
          }
          labels={labels}
          focusRef={inviteErrorRef}
        />
        <div className="dashboard-users-field">
          <label htmlFor="administrator-name">{labels.invite.name}</label>
          <input
            id="administrator-name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </div>
        <div className="dashboard-users-field">
          <label htmlFor="administrator-email">{labels.invite.email}</label>
          <input
            id="administrator-email"
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
          />
        </div>
        <div className="dashboard-users-field">
          <label htmlFor="administrator-language">
            {labels.invite.language}
          </label>
          <DashboardSelect
            id="administrator-language"
            name="inviteLocale"
            defaultValue={locale}
          >
            {(Object.keys(labels.localeNames) as SupportedLocale[]).map(
              (candidate) => (
                <option key={candidate} value={candidate}>
                  {labels.localeNames[candidate]}
                </option>
              ),
            )}
          </DashboardSelect>
        </div>
        <div className="dashboard-users-dialog-actions">
          <Button
            type="button"
            variant="secondary"
            autoFocus
            disabled={invitePending}
            onClick={() => inviteDialogRef.current?.close()}
          >
            {labels.cancel}
          </Button>
          <Button type="submit" disabled={invitePending}>
            {invitePending ? labels.invite.submitting : labels.invite.submit}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
