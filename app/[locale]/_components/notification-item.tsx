import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/button";
import type { NotificationPresentationDto } from "@/lib/in-app-notifications/model";

function relativeTime(createdAt: string, t: TFunction<"notifications">) {
  const elapsed = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return t("relative.justNow");
  if (minutes < 60) return t("relative.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relative.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("relative.days", { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("relative.weeks", { count: weeks });
  const months = Math.floor(days / 30);
  if (months < 12) return t("relative.months", { count: months });
  return t("relative.years", { count: Math.floor(days / 365) });
}

export function NotificationItem({
  item,
  locale,
  pending,
  onActivate,
}: {
  item: NotificationPresentationDto;
  locale: string;
  pending: boolean;
  onActivate: () => void;
}) {
  const { t } = useTranslation("notifications");
  const absoluteTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(item.createdAt));
  return (
    <li>
      <Button
        type="button"
        className="site-notification-item"
        variant="informational"
        fullWidth
        data-unread={item.readAt === null || undefined}
        disabled={pending}
        onClick={onActivate}
      >
        <span className="site-notification-item-heading">
          {item.readAt === null ? (
            <span className="site-notification-unread-mark">
              <span aria-hidden="true" />
              <span className="sr-only">{t("items.unread")}</span>
            </span>
          ) : null}
          <strong>{t(item.titleKey, item.values)}</strong>
        </span>
        <span className="site-notification-item-body">{t(item.bodyKey)}</span>
        <time dateTime={item.createdAt} title={absoluteTime}>
          {pending ? t("status.opening") : relativeTime(item.createdAt, t)}
        </time>
      </Button>
    </li>
  );
}
