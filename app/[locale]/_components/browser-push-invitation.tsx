"use client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/button";
import type { useBrowserPush } from "./use-browser-push";

function focusVisibleNotificationBell() {
  requestAnimationFrame(() => {
    Array.from(document.querySelectorAll<HTMLButtonElement>(
      'button[aria-controls="notification-panel"]',
    )).find((button) => button.getClientRects().length > 0)?.focus();
  });
}

export function BrowserPushInvitation({
  push,
}: {
  push: ReturnType<typeof useBrowserPush>;
}) {
  const { t } = useTranslation("notifications");
  const feedback = (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {push.feedback ? t(`push.feedback.${push.feedback}`) : ""}
    </p>
  );
  if (!push.invitationVisible) return feedback;
  const enable = async () => {
    await push.enable();
    focusVisibleNotificationBell();
  };
  const dismiss = () => {
    push.dismissInvitation();
    focusVisibleNotificationBell();
  };
  return (
    <aside className="site-push-invitation" aria-labelledby="push-invitation-title">
      <div>
        <strong id="push-invitation-title">{t("push.invitation.title")}</strong>
        <p>{t("push.invitation.body")}</p>
      </div>
      <div className="site-push-invitation-actions">
        <Button type="button" disabled={push.busy} onClick={() => void enable()}>
          {push.busy ? t("push.actions.enabling") : t("push.actions.enable")}
        </Button>
        <Button type="button" variant="secondary" onClick={dismiss}>
          {t("push.actions.dismiss")}
        </Button>
      </div>
      {feedback}
    </aside>
  );
}
