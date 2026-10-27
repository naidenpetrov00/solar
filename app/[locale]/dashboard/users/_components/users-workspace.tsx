"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

import type {
  ManagedUser,
  ManagedUserAction,
} from "@/lib/user-management-model";
import { manageUserAction } from "../actions";
import { inviteAdministratorAction } from "../invite-administrator-action";
import {
  ResultMessage,
  initialUserActionResult,
  type UsersWorkspaceLabels,
} from "./users-feedback";
import {
  UserConfirmationDialog,
  AdministratorInviteDialog,
} from "./users-dialogs";
import { UsersLedger } from "./users-ledger";
import { UserDetail } from "./user-detail";

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
  const [managementResult, managementAction, managementPending] =
    useActionState(manageUserAction, initialUserActionResult);
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
  const selected =
    users.find((candidate) => candidate.id === selectedId) ?? null;
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
    if (
      inviteResult.status === "success" ||
      inviteResult.status === "warning"
    ) {
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
      {inviteResult.status === "success" ||
      inviteResult.status === "warning" ? (
        <ResultMessage result={inviteResult} labels={labels} />
      ) : null}

      <div
        className="dashboard-users-workspace"
        data-detail-open={selected ? "true" : "false"}
      >
        <UsersLedger
          users={users}
          selectedId={selectedId}
          labels={labels}
          selectUser={selectUser}
        />

        <UserDetail
          selected={selected}
          labels={labels}
          dateFormatter={dateFormatter}
          detailHeadingRef={detailHeadingRef}
          onClose={() => {
            setSelectedId(null);
            restoreInvokerFocus();
          }}
          openConfirmation={openConfirmation}
        />
      </div>

      <UserConfirmationDialog
        confirmationDialogRef={confirmationDialogRef}
        confirmation={confirmation}
        managementAction={managementAction}
        managementPending={managementPending}
        managementResult={managementResult}
        managementResultAtOpen={managementResultAtOpen}
        locale={locale}
        labels={labels}
        managementErrorRef={managementErrorRef}
        onClose={restoreInvokerFocus}
      />

      {canInvite ? (
        <AdministratorInviteDialog
          inviteDialogRef={inviteDialogRef}
          inviteAction={inviteAction}
          invitePending={invitePending}
          inviteResult={inviteResult}
          inviteResultAtOpen={inviteResultAtOpen}
          locale={locale}
          labels={labels}
          inviteErrorRef={inviteErrorRef}
          onClose={restoreInvokerFocus}
        />
      ) : null}
    </>
  );
}
