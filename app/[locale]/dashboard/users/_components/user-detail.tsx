import { Button } from "@/components/button";
import type { MouseEvent, RefObject } from "react";
import type {
  ManagedUser,
  ManagedUserAction,
} from "@/lib/user-management-model";
import type { UserActionResult } from "../user-action-model";
import type { UsersWorkspaceLabels } from "./users-feedback";
import { UserOrderEmailPreference } from "./user-order-email-preference";

export function UserDetail({
  selected,
  labels,
  dateFormatter,
  detailHeadingRef,
  onClose,
  openConfirmation,
  locale,
  preferenceDraft,
  preferencePending,
  preferenceActionPending,
  preferenceResult,
  preferenceErrorRef,
  preferenceAction,
  onPreferenceChange,
  onPreferenceSubmit,
  onPreferenceDiscard,
}: {
  selected: ManagedUser | null;
  labels: UsersWorkspaceLabels;
  dateFormatter: Intl.DateTimeFormat;
  detailHeadingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  openConfirmation: (
    action: ManagedUserAction,
    user: ManagedUser,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  locale: string;
  preferenceDraft: boolean;
  preferencePending: boolean;
  preferenceActionPending: boolean;
  preferenceResult: UserActionResult;
  preferenceErrorRef: RefObject<HTMLParagraphElement | null>;
  preferenceAction: (formData: FormData) => void;
  onPreferenceChange: (enabled: boolean) => void;
  onPreferenceSubmit: () => void;
  onPreferenceDiscard: () => void;
}) {
  return (
    <aside className="dashboard-user-detail" aria-live="polite">
      {selected ? (
        <>
          <Button
            type="button"
            className="dashboard-user-detail-back"
            variant="informational"
            disabled={preferenceActionPending}
            onClick={() => {
              onClose();
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20">
              <path
                d="M16 10H5m4-4-4 4 4 4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            {labels.backToUsers}
          </Button>
          <header>
            <h2 ref={detailHeadingRef} tabIndex={-1}>
              {selected.name}
            </h2>
            <p>{selected.email}</p>
          </header>
          <dl>
            <div>
              <dt>{labels.role}</dt>
              <dd>{labels.roles[selected.role]}</dd>
            </div>
            <div>
              <dt>{labels.verification}</dt>
              <dd>
                {selected.emailVerified
                  ? labels.verificationStates.verified
                  : labels.verificationStates.unverified}
              </dd>
            </div>
            <div>
              <dt>{labels.status}</dt>
              <dd>
                {selected.blocked
                  ? labels.accountStates.blocked
                  : labels.accountStates.active}
              </dd>
            </div>
            <div>
              <dt>{labels.createdAt}</dt>
              <dd>{dateFormatter.format(new Date(selected.createdAt))}</dd>
            </div>
            <div>
              <dt>{labels.updatedAt}</dt>
              <dd>{dateFormatter.format(new Date(selected.updatedAt))}</dd>
            </div>
          </dl>
          <UserOrderEmailPreference
            user={selected}
            enabled={preferenceDraft}
            locale={locale}
            pending={preferencePending}
            actionPending={preferenceActionPending}
            result={preferenceResult}
            errorRef={preferenceErrorRef}
            action={preferenceAction}
            onChange={onPreferenceChange}
            onSubmit={onPreferenceSubmit}
            onDiscard={onPreferenceDiscard}
            labels={labels}
          />
          {selected.actions.length > 0 ? (
            <section
              className="dashboard-user-actions"
              aria-labelledby="dashboard-user-actions-title"
            >
              <h3 id="dashboard-user-actions-title">{labels.actionsTitle}</h3>
              <div>
                {selected.actions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant="secondary"
                    tone={
                      action === "block" || action === "demote"
                        ? "danger"
                        : "default"
                    }
                    disabled={preferenceActionPending}
                    onClick={(event) =>
                      openConfirmation(action, selected, event)
                    }
                  >
                    {labels.actions[action]}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="dashboard-user-detail-empty">
          <h2>{labels.noSelectionTitle}</h2>
          <p>{labels.noSelectionDescription}</p>
        </div>
      )}
    </aside>
  );
}
