import { useTranslation } from "react-i18next";

import { Button } from "@/components/button";
import type { NotificationUnreadSummary } from "@/lib/in-app-notifications/model";

export function NotificationBell({
  open,
  unread,
  onToggle,
}: {
  open: boolean;
  unread: NotificationUnreadSummary;
  onToggle: (trigger: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation("notifications");
  const label = open
    ? unread.overflow
      ? t("badge.closeOverflow")
      : unread.count > 0
        ? t("badge.closeCount", { count: unread.count })
        : t("badge.closeZero")
    : unread.overflow
      ? t("badge.overflow")
      : unread.count > 0
        ? t("badge.count", { count: unread.count })
        : t("badge.zero");

  return (
    <Button
      type="button"
      className="site-notification-bell relative size-11"
      size="icon"
      variant="secondary"
      aria-haspopup="dialog"
      aria-controls="notification-panel"
      aria-expanded={open}
      aria-label={label}
      onClick={(event) => onToggle(event.currentTarget)}
    >
      <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6 2.5 7.5H4c0-1.5 2.5-1.5 2.5-7.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M10 20h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      {(unread.count > 0 || unread.overflow) && (
        <span className="site-notification-count" aria-hidden="true">
          {unread.overflow ? "99+" : unread.count}
        </span>
      )}
    </Button>
  );
}
