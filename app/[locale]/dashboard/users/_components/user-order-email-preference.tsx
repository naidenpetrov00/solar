import type { RefObject } from "react";

import { Button } from "@/components/button";
import type { ManagedUser } from "@/lib/user-management-model";
import type { UserActionResult } from "../user-action-model";
import { ResultMessage, type UsersWorkspaceLabels } from "./users-feedback";

export function UserOrderEmailPreference({
  user,
  enabled,
  locale,
  pending,
  actionPending,
  result,
  errorRef,
  action,
  onChange,
  onSubmit,
  onDiscard,
  labels,
}: {
  user: ManagedUser;
  enabled: boolean;
  locale: string;
  pending: boolean;
  actionPending: boolean;
  result: UserActionResult;
  errorRef: RefObject<HTMLParagraphElement | null>;
  action: (formData: FormData) => void;
  onChange: (enabled: boolean) => void;
  onSubmit: () => void;
  onDiscard: () => void;
  labels: UsersWorkspaceLabels;
}) {
  const preference = user.orderEmailPreference;
  if (!preference) return null;

  const dirty = enabled !== preference.enabled;
  const ownsResult = result.targetId === user.id;
  const helpId = `order-email-preference-help-${user.id}`;

  if (!preference.canManage) {
    return (
      <section
        className="dashboard-user-order-email-preference"
        aria-labelledby={`order-email-preference-title-${user.id}`}
      >
        <h3 id={`order-email-preference-title-${user.id}`}>
          {labels.orderEmails.title}
        </h3>
        <p>
          <strong>{labels.orderEmails.label}</strong>{" "}
          {enabled ? labels.orderEmails.enabled : labels.orderEmails.disabled}
        </p>
        <p id={helpId}>{labels.orderEmails.help}</p>
      </section>
    );
  }

  return (
    <section
      className="dashboard-user-order-email-preference"
      aria-labelledby={`order-email-preference-title-${user.id}`}
    >
      <h3 id={`order-email-preference-title-${user.id}`}>
        {labels.orderEmails.title}
      </h3>
      <form action={action} aria-busy={pending} onSubmit={onSubmit}>
        <input type="hidden" name="targetId" value={user.id} />
        <input
          type="hidden"
          name="expectedVersion"
          value={preference.mutationVersion}
        />
        <input type="hidden" name="enabled" value={String(enabled)} />
        <input type="hidden" name="locale" value={locale} />
        <label className="dashboard-user-order-email-toggle">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!preference.canManage || pending}
            aria-describedby={helpId}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{labels.orderEmails.label}</span>
        </label>
        <p id={helpId}>{labels.orderEmails.help}</p>
        {ownsResult && result.status === "error" ? (
          <ResultMessage result={result} labels={labels} focusRef={errorRef} />
        ) : null}
        {preference.canManage ? (
          <div className="dashboard-user-order-email-actions">
            <Button type="submit" disabled={!dirty || actionPending}>
              {pending ? labels.orderEmails.saving : labels.orderEmails.save}
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={onDiscard}
              >
                {labels.orderEmails.discard}
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}
