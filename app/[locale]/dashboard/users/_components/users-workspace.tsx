"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

import type { SupportedLocale } from "../../../_lib/routes";
import type { ManagedUser, ManagedUserAction } from "@/lib/user-management";
import {
  inviteAdministratorAction,
  manageUserAction,
  type UserActionResult,
} from "../actions";
import { DashboardSelect } from "../../_components/dashboard-select";

const initialUserActionResult: UserActionResult = { status: "idle" };

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

function ResultMessage({
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

export function UsersWorkspace({
  users,
  locale,
  canInvite,
  labels,
}: {
  users: ManagedUser[];
  locale: string;
  canInvite: boolean;
  labels: UsersWorkspaceLabels;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    action: ManagedUserAction;
    user: ManagedUser;
  } | null>(null);
  const [managementResult, managementAction, managementPending] = useActionState(
    manageUserAction,
    initialUserActionResult,
  );
  const [inviteResult, inviteAction, invitePending] = useActionState(
    inviteAdministratorAction,
    initialUserActionResult,
  );
  const [managementResultAtOpen, setManagementResultAtOpen] = useState(
    initialUserActionResult,
  );
  const [inviteResultAtOpen, setInviteResultAtOpen] = useState(
    initialUserActionResult,
  );
  const confirmationDialogRef = useRef<HTMLDialogElement>(null);
  const inviteDialogRef = useRef<HTMLDialogElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastInvokerRef = useRef<HTMLButtonElement | null>(null);
  const managementErrorRef = useRef<HTMLParagraphElement>(null);
  const inviteErrorRef = useRef<HTMLParagraphElement>(null);
  const selected = users.find((candidate) => candidate.id === selectedId) ?? null;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  useEffect(() => {
    if (selectedId) {
      detailHeadingRef.current?.focus();
    }
  }, [selectedId]);

  useEffect(() => {
    if (managementResult.status === "success") {
      confirmationDialogRef.current?.close();
      router.refresh();
    } else if (managementResult.status === "error") {
      managementErrorRef.current?.focus();
    }
  }, [managementResult, router]);

  useEffect(() => {
    if (inviteResult.status === "success" || inviteResult.status === "warning") {
      inviteDialogRef.current?.close();
      router.refresh();
    } else if (inviteResult.status === "error") {
      inviteErrorRef.current?.focus();
    }
  }, [inviteResult, router]);

  const selectUser = (candidate: ManagedUser, invoker: HTMLButtonElement) => {
    lastInvokerRef.current = invoker;
    setSelectedId(candidate.id);
  };

  const openConfirmation = (
    action: ManagedUserAction,
    candidate: ManagedUser,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    lastInvokerRef.current = event.currentTarget;
    setManagementResultAtOpen(managementResult);
    setConfirmation({ action, user: candidate });
    requestAnimationFrame(() => confirmationDialogRef.current?.showModal());
  };

  const restoreInvokerFocus = () => {
    requestAnimationFrame(() => lastInvokerRef.current?.focus());
  };

  return (
    <>
      <div className="dashboard-users-heading-row">
        <h2>{labels.selectUser}</h2>
        {canInvite ? (
          <Button
            type="button"
            className="dashboard-users-primary-action"
            onClick={(event) => {
              lastInvokerRef.current = event.currentTarget;
              setInviteResultAtOpen(inviteResult);
              inviteDialogRef.current?.showModal();
            }}
          >
            {labels.invite.open}
          </Button>
        ) : null}
      </div>

      {managementResult.status === "success" ? (
        <ResultMessage result={managementResult} labels={labels} />
      ) : null}
      {inviteResult.status === "success" || inviteResult.status === "warning" ? (
        <ResultMessage result={inviteResult} labels={labels} />
      ) : null}

      <div className="dashboard-users-workspace" data-detail-open={selected ? "true" : "false"}>
        <div className="dashboard-users-ledger">
          <table>
            <thead>
              <tr>
                <th scope="col">{labels.name}</th>
                <th scope="col">{labels.role}</th>
                <th scope="col">{labels.status}</th>
                <th scope="col"><span className="sr-only">{labels.selectUser}</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((candidate) => (
                <tr key={candidate.id} data-selected={selectedId === candidate.id ? "true" : undefined}>
                  <td>
                    <strong>{candidate.name}</strong>
                    <span>{candidate.email}</span>
                  </td>
                  <td>{labels.roles[candidate.role]}</td>
                  <td>
                    <span className="dashboard-users-status" data-tone={candidate.blocked ? "blocked" : "active"}>
                      {candidate.blocked
                        ? labels.accountStates.blocked
                        : labels.accountStates.active}
                    </span>
                  </td>
                  <td>
                    <Button
                      type="button"
                      className="dashboard-users-select"
                      variant="informational"
                      aria-pressed={selectedId === candidate.id}
                      onClick={(event) => selectUser(candidate, event.currentTarget)}
                    >
                      {labels.selectUser}
                      <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20">
                        <path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </svg>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="dashboard-users-mobile-list">
            {users.map((candidate) => (
              <li key={candidate.id}>
                <Button
                  type="button"
                  variant="secondary"
                  aria-pressed={selectedId === candidate.id}
                  onClick={(event) => selectUser(candidate, event.currentTarget)}
                >
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.email}</small>
                  </span>
                  <span>
                    {labels.roles[candidate.role]}
                    <small>{candidate.blocked ? labels.accountStates.blocked : labels.accountStates.active}</small>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="dashboard-user-detail" aria-live="polite">
          {selected ? (
            <>
              <Button
                type="button"
                className="dashboard-user-detail-back"
                variant="informational"
                onClick={() => {
                  setSelectedId(null);
                  restoreInvokerFocus();
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20">
                  <path d="M16 10H5m4-4-4 4 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
                {labels.backToUsers}
              </Button>
              <header>
                <h2 ref={detailHeadingRef} tabIndex={-1}>{selected.name}</h2>
                <p>{selected.email}</p>
              </header>
              <dl>
                <div><dt>{labels.role}</dt><dd>{labels.roles[selected.role]}</dd></div>
                <div><dt>{labels.verification}</dt><dd>{selected.emailVerified ? labels.verificationStates.verified : labels.verificationStates.unverified}</dd></div>
                <div><dt>{labels.status}</dt><dd>{selected.blocked ? labels.accountStates.blocked : labels.accountStates.active}</dd></div>
                <div><dt>{labels.createdAt}</dt><dd>{dateFormatter.format(new Date(selected.createdAt))}</dd></div>
                <div><dt>{labels.updatedAt}</dt><dd>{dateFormatter.format(new Date(selected.updatedAt))}</dd></div>
              </dl>
              <section className="dashboard-user-actions" aria-labelledby="dashboard-user-actions-title">
                <h3 id="dashboard-user-actions-title">{labels.actionsTitle}</h3>
                <div>
                  {selected.actions.map((action) => (
                    <Button
                      key={action}
                      type="button"
                      variant="secondary"
                      tone={action === "block" || action === "demote" ? "danger" : "default"}
                      onClick={(event) => openConfirmation(action, selected, event)}
                    >
                      {labels.actions[action]}
                    </Button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="dashboard-user-detail-empty">
              <h2>{labels.noSelectionTitle}</h2>
              <p>{labels.noSelectionDescription}</p>
            </div>
          )}
        </aside>
      </div>

      <dialog
        ref={confirmationDialogRef}
        className="dashboard-users-dialog"
        aria-labelledby="dashboard-users-confirmation-title"
        aria-describedby="dashboard-users-confirmation-description"
        onClose={restoreInvokerFocus}
      >
        {confirmation ? (
          <form action={managementAction} aria-busy={managementPending}>
            <input type="hidden" name="targetId" value={confirmation.user.id} />
            <input type="hidden" name="expectedUpdatedAt" value={confirmation.user.updatedAt} />
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

      {canInvite ? (
        <dialog
          ref={inviteDialogRef}
          className="dashboard-users-dialog dashboard-users-invite-dialog"
          aria-labelledby="dashboard-users-invite-title"
          aria-describedby="dashboard-users-invite-description"
          onClose={restoreInvokerFocus}
        >
          <form action={inviteAction} aria-busy={invitePending}>
            <input type="hidden" name="dashboardLocale" value={locale} />
            <h2 id="dashboard-users-invite-title">{labels.invite.title}</h2>
            <p id="dashboard-users-invite-description">{labels.invite.description}</p>
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
              <input id="administrator-name" name="name" required minLength={2} maxLength={100} autoComplete="name" />
            </div>
            <div className="dashboard-users-field">
              <label htmlFor="administrator-email">{labels.invite.email}</label>
              <input id="administrator-email" name="email" type="email" required maxLength={320} autoComplete="email" />
            </div>
            <div className="dashboard-users-field">
              <label htmlFor="administrator-language">{labels.invite.language}</label>
              <DashboardSelect id="administrator-language" name="inviteLocale" defaultValue={locale}>
                {(Object.keys(labels.localeNames) as SupportedLocale[]).map((candidate) => (
                  <option key={candidate} value={candidate}>{labels.localeNames[candidate]}</option>
                ))}
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
      ) : null}
    </>
  );
}
