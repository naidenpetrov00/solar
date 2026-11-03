"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/button";
import type { ManagedNotificationRecipient } from "@/lib/order-notifications/recipient-management";
import { useUnsavedChangesGuard } from "../../../_components/use-unsaved-changes-guard";
import { createRecipientAction, updateRecipientAction } from "../actions";
import {
  initialRecipientActionResult,
  type RecipientActionCode,
} from "../recipient-action-model";

type Draft = { name: string; email: string };

export type RecipientLabels = {
  title: string;
  description: string;
  back: string;
  warning: string;
  createTitle: string;
  createDescription: string;
  name: string;
  email: string;
  status: string;
  active: string;
  inactive: string;
  createdAt: string;
  updatedAt: string;
  create: string;
  creating: string;
  save: string;
  saving: string;
  activate: string;
  deactivate: string;
  empty: string;
  unsaved: string;
  required: string;
  invalid: string;
  confirmTitle: string;
  confirmDescription: string;
  confirm: string;
  cancel: string;
  results: Record<RecipientActionCode, string>;
};

export function RecipientManager({
  recipients,
  locale,
  canManage,
  labels,
}: {
  recipients: ManagedNotificationRecipient[];
  locale: string;
  canManage: boolean;
  labels: RecipientLabels;
}) {
  const router = useRouter();
  const [createDraft, setCreateDraft] = useState<Draft>({ name: "", email: "" });
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(recipients.map((recipient) => [recipient.id, { name: recipient.name, email: recipient.email }])),
  );
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ManagedNotificationRecipient | null>(null);
  const [createResult, createAction, createPending] = useActionState(
    createRecipientAction,
    initialRecipientActionResult,
  );
  const [updateResult, updateAction, updatePending] = useActionState(
    updateRecipientAction,
    initialRecipientActionResult,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);
  const updateErrorRef = useRef<HTMLParagraphElement>(null);
  const dialogErrorRef = useRef<HTMLParagraphElement>(null);
  const createErrorRef = useRef<HTMLParagraphElement>(null);
  const resultAtOpenRef = useRef(initialRecipientActionResult);
  const synchronizedUpdateRef = useRef<string | null>(null);
  const initialDrafts = useMemo(
    () => Object.fromEntries(recipients.map((recipient) => [recipient.id, { name: recipient.name, email: recipient.email }])),
    [recipients],
  );
  const dirty =
    Boolean(createDraft.name || createDraft.email) ||
    recipients.some((recipient) => {
      const draft = drafts[recipient.id];
      return draft?.name !== recipient.name || draft?.email !== recipient.email;
    });
  const discard = useCallback(() => {
    setCreateDraft({ name: "", email: "" });
    setDrafts(initialDrafts);
  }, [initialDrafts]);
  useUnsavedChangesGuard({
    hasUnsavedChanges: dirty,
    message: labels.unsaved,
    onDiscard: discard,
  });

  useEffect(() => {
    if (createResult.status === "success") {
      setCreateDraft({ name: "", email: "" });
      router.refresh();
    } else if (createResult.status === "error") {
      createErrorRef.current?.focus();
    }
  }, [createResult, router]);

  useEffect(() => {
    if (updateResult.status === "success") {
      dialogRef.current?.close();
      router.refresh();
    } else if (updateResult.status === "error") {
      setPendingRecipientId(null);
      if (dialogRef.current?.open && updateResult !== resultAtOpenRef.current) {
        dialogErrorRef.current?.focus();
      } else {
        updateErrorRef.current?.focus();
      }
    }
  }, [updateResult, router]);

  useEffect(() => {
    if (
      updateResult.status !== "success" ||
      !updateResult.targetId ||
      !updateResult.mutationVersion
    ) return;
    const targetId = updateResult.targetId;
    const mutationVersion = updateResult.mutationVersion;
    const synchronizationKey =
      `${targetId}:${mutationVersion}`;
    if (synchronizedUpdateRef.current === synchronizationKey) return;
    const refreshed = recipients.find(
      (recipient) =>
        recipient.id === targetId &&
        recipient.mutationVersion >= mutationVersion,
    );
    if (!refreshed) return;
    setDrafts((current) => ({
      ...current,
      [refreshed.id]: { name: refreshed.name, email: refreshed.email },
    }));
    setPendingRecipientId(null);
    synchronizedUpdateRef.current = synchronizationKey;
  }, [recipients, updateResult]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Sofia",
        timeZoneName: "short",
      }),
    [locale],
  );

  const openDeactivate = (
    recipient: ManagedNotificationRecipient,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    invokerRef.current = event.currentTarget;
    resultAtOpenRef.current = updateResult;
    setConfirmation(recipient);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  };

  return (
    <>
      {canManage ? (
        <section className="dashboard-order-recipient-create" aria-labelledby="recipient-create-title">
          <h2 id="recipient-create-title">{labels.createTitle}</h2>
          <p>{labels.createDescription}</p>
          <form action={createAction} aria-busy={createPending}>
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor="recipient-create-name">{labels.name}</label>
            <input
              id="recipient-create-name"
              name="name"
              autoComplete="name"
              value={createDraft.name}
              aria-invalid={createResult.fieldErrors?.name ? true : undefined}
              aria-describedby={createResult.fieldErrors?.name ? "recipient-create-name-error" : undefined}
              onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
            />
            {createResult.fieldErrors?.name ? <p id="recipient-create-name-error" className="dashboard-order-field-error">{createResult.fieldErrors.name === "REQUIRED" ? labels.required : labels.invalid}</p> : null}
            <label htmlFor="recipient-create-email">{labels.email}</label>
            <input
              id="recipient-create-email"
              name="email"
              type="email"
              autoComplete="email"
              value={createDraft.email}
              aria-invalid={createResult.fieldErrors?.email ? true : undefined}
              aria-describedby={createResult.fieldErrors?.email ? "recipient-create-email-error" : undefined}
              onChange={(event) => setCreateDraft((current) => ({ ...current, email: event.target.value }))}
            />
            {createResult.fieldErrors?.email ? <p id="recipient-create-email-error" className="dashboard-order-field-error">{createResult.fieldErrors.email === "REQUIRED" ? labels.required : labels.invalid}</p> : null}
            {createResult.status === "error" ? (
              <p ref={createErrorRef} className="dashboard-order-result" data-tone="error" role="alert" tabIndex={-1}>
                {createResult.code ? labels.results[createResult.code] : labels.results.TEMPORARY_FAILURE}
              </p>
            ) : null}
            <Button type="submit" disabled={createPending}>
              {createPending ? labels.creating : labels.create}
            </Button>
          </form>
        </section>
      ) : null}

      {createResult.status === "success" && createResult.code ? (
        <p className="dashboard-order-result" data-tone="success" role="status">{labels.results[createResult.code]}</p>
      ) : null}
      {updateResult.status === "success" && updateResult.code ? (
        <p className="dashboard-order-result" data-tone="success" role="status">{labels.results[updateResult.code]}</p>
      ) : null}

      <section className="dashboard-order-recipients" aria-label={labels.title}>
        {recipients.length === 0 ? <p>{labels.empty}</p> : recipients.map((recipient) => {
          const draft = drafts[recipient.id] ?? { name: recipient.name, email: recipient.email };
          const nameId = `recipient-name-${recipient.id}`;
          const emailId = `recipient-email-${recipient.id}`;
          const nameErrorId = `${nameId}-error`;
          const emailErrorId = `${emailId}-error`;
          const fieldErrors = updateResult.targetId === recipient.id ? updateResult.fieldErrors : undefined;
          const isRecipientPending =
            updatePending && pendingRecipientId === recipient.id;
          return (
            <article key={recipient.id} className="dashboard-order-recipient">
              <form
                action={updateAction}
                aria-busy={isRecipientPending}
                onSubmit={() => setPendingRecipientId(recipient.id)}
              >
                <input type="hidden" name="recipientId" value={recipient.id} />
                <input type="hidden" name="expectedVersion" value={recipient.mutationVersion} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="defaultIntent" value="save" />
                <input type="hidden" name="active" value={String(recipient.active)} />
                <div className="dashboard-order-recipient-fields">
                  <div><label htmlFor={nameId}>{labels.name}</label><input id={nameId} name="name" value={draft.name} readOnly={!canManage || isRecipientPending} aria-invalid={fieldErrors?.name ? true : undefined} aria-describedby={fieldErrors?.name ? nameErrorId : undefined} onChange={(event) => setDrafts((current) => ({ ...current, [recipient.id]: { ...draft, name: event.target.value } }))} />{fieldErrors?.name ? <p id={nameErrorId} className="dashboard-order-field-error">{fieldErrors.name === "REQUIRED" ? labels.required : labels.invalid}</p> : null}</div>
                  <div><label htmlFor={emailId}>{labels.email}</label><input id={emailId} name="email" type="email" value={draft.email} readOnly={!canManage || isRecipientPending} aria-invalid={fieldErrors?.email ? true : undefined} aria-describedby={fieldErrors?.email ? emailErrorId : undefined} onChange={(event) => setDrafts((current) => ({ ...current, [recipient.id]: { ...draft, email: event.target.value } }))} />{fieldErrors?.email ? <p id={emailErrorId} className="dashboard-order-field-error">{fieldErrors.email === "REQUIRED" ? labels.required : labels.invalid}</p> : null}</div>
                </div>
                <dl>
                  <div><dt>{labels.status}</dt><dd><span className="dashboard-order-status" data-status={recipient.active ? "approved" : "cancelled"}>{recipient.active ? labels.active : labels.inactive}</span></dd></div>
                  <div><dt>{labels.createdAt}</dt><dd><time dateTime={recipient.createdAt}>{formatter.format(new Date(recipient.createdAt))}</time></dd></div>
                  <div><dt>{labels.updatedAt}</dt><dd><time dateTime={recipient.updatedAt}>{formatter.format(new Date(recipient.updatedAt))}</time></dd></div>
                </dl>
                {updateResult.status === "error" && updateResult.targetId === recipient.id ? (
                  <p ref={updateErrorRef} className="dashboard-order-result" data-tone="error" role="alert" tabIndex={-1}>{updateResult.code ? labels.results[updateResult.code] : labels.results.TEMPORARY_FAILURE}</p>
                ) : null}
                {canManage ? (
                  <div className="dashboard-order-recipient-actions">
                    <Button type="submit" name="intent" value="save" variant="secondary" disabled={updatePending}>{isRecipientPending ? labels.saving : labels.save}</Button>
                    {recipient.active ? (
                      <Button type="button" variant="secondary" tone="danger" disabled={updatePending} onClick={(event) => openDeactivate({ ...recipient, ...draft }, event)}>{labels.deactivate}</Button>
                    ) : (
                      <Button type="submit" name="intent" value="activate" disabled={updatePending}>{labels.activate}</Button>
                    )}
                  </div>
                ) : null}
              </form>
            </article>
          );
        })}
      </section>

      <dialog ref={dialogRef} className="dashboard-order-dialog" aria-labelledby="recipient-deactivate-title" aria-describedby="recipient-deactivate-description" onClose={() => requestAnimationFrame(() => invokerRef.current?.focus())}>
        {confirmation ? (
          <form
            action={updateAction}
            aria-busy={updatePending && pendingRecipientId === confirmation.id}
            onSubmit={() => setPendingRecipientId(confirmation.id)}
          >
            <input type="hidden" name="recipientId" value={confirmation.id} />
            <input type="hidden" name="expectedVersion" value={confirmation.mutationVersion} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="intent" value="deactivate" />
            <input type="hidden" name="name" value={confirmation.name} />
            <input type="hidden" name="email" value={confirmation.email} />
            <h2 id="recipient-deactivate-title">{labels.confirmTitle}</h2>
            <p id="recipient-deactivate-description">{labels.confirmDescription}</p>
            {updateResult.status === "error" && updateResult !== resultAtOpenRef.current ? (
              <p ref={dialogErrorRef} className="dashboard-order-result" data-tone="error" role="alert" tabIndex={-1}>{updateResult.code ? labels.results[updateResult.code] : labels.results.TEMPORARY_FAILURE}</p>
            ) : null}
            <div className="dashboard-order-dialog-actions">
              <Button type="button" variant="secondary" autoFocus disabled={updatePending} onClick={() => dialogRef.current?.close()}>{labels.cancel}</Button>
              <Button type="submit" tone="danger" disabled={updatePending}>{labels.confirm}</Button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
