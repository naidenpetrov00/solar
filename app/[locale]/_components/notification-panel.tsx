"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/button";
import { NotificationBell } from "./notification-bell";
import { NotificationItem } from "./notification-item";
import type { useNotificationCenter } from "./use-notification-center";

type NotificationCenter = ReturnType<typeof useNotificationCenter>;

export function NotificationPanel({
  locale,
  center,
}: {
  locale: string;
  center: NotificationCenter;
}) {
  const { t } = useTranslation("notifications");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const switchingMode = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!center.open) {
      if (dialog.open) dialog.close();
      return;
    }
    const mobile = window.matchMedia("(max-width: 79.999rem)");
    let modeFrame: number | undefined;
    const show = () => {
      if (dialog.open) return;
      if (mobile.matches) dialog.showModal();
      else dialog.show();
    };
    const changeMode = () => {
      if (!dialog.open) return;
      switchingMode.current = true;
      dialog.close();
      modeFrame = requestAnimationFrame(() => {
        show();
        closeButtonRef.current?.focus();
        switchingMode.current = false;
      });
    };
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (
        mobile.matches ||
        !(target instanceof Node) ||
        dialog.contains(target) ||
        center.triggerRef.current?.contains(target)
      ) return;
      dialog.close();
    };
    const escape = (event: KeyboardEvent) => {
      if (!mobile.matches && event.key === "Escape") dialog.close();
    };
    show();
    mobile.addEventListener("change", changeMode);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      if (modeFrame !== undefined) cancelAnimationFrame(modeFrame);
      switchingMode.current = false;
      mobile.removeEventListener("change", changeMode);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [center.open, center.triggerRef]);

  const restoreTriggerFocus = () => {
    const preferred = center.triggerRef.current;
    const visibleTrigger = preferred?.getClientRects().length
      ? preferred
      : Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            'button[aria-controls="notification-panel"]',
          ),
        ).find(
          (candidate) =>
            !dialogRef.current?.contains(candidate) &&
            candidate.getClientRects().length > 0,
        );
    visibleTrigger?.focus();
  };

  const closeAndRestore = () => {
    if (switchingMode.current) return;
    const restoreFocus = center.restoreFocusRef.current;
    center.close();
    if (restoreFocus) {
      requestAnimationFrame(restoreTriggerFocus);
    }
  };
  const empty = center.filter === "unread" ? t("empty.unread") : t("empty.all");

  return (
    <dialog
      ref={dialogRef}
      id="notification-panel"
      className="site-notification-panel"
      aria-labelledby="notification-panel-title"
      onClose={closeAndRestore}
    >
      <div className="site-notification-panel-header">
        <h2 id="notification-panel-title">{t("title")}</h2>
        <div className="site-notification-panel-dismissals">
          <span className="site-notification-mobile-bell">
            <NotificationBell
              open
              unread={center.unread}
              onToggle={() => dialogRef.current?.close()}
            />
          </span>
          <Button ref={closeButtonRef} type="button" variant="secondary" autoFocus onClick={() => dialogRef.current?.close()}>
            {t("close")}
          </Button>
        </div>
      </div>
      <div className="site-notification-toolbar">
        <div className="site-notification-filters" role="group" aria-label={t("filters.label")}>
          <Button type="button" variant="secondary" aria-pressed={center.filter === "unread"} onClick={() => center.setFilter("unread")}>
            {t("filters.unread")}
          </Button>
          <Button type="button" variant="secondary" aria-pressed={center.filter === "all"} onClick={() => center.setFilter("all")}>
            {t("filters.all")}
          </Button>
        </div>
        <Button type="button" variant="informational" disabled={center.unread.count === 0 || center.markingAll} onClick={() => void center.markAll()}>
          {center.markingAll ? t("status.markingAll") : t("actions.markAll")}
        </Button>
      </div>
      <div className="site-notification-content" aria-busy={center.loading || center.loadingMore}>
        {center.error ? (
          <div className="site-notification-error" role="alert">
            <p>{t(`errors.${center.error}`)}</p>
            <Button type="button" variant="secondary" onClick={() => void center.retry()}>{t("actions.retry")}</Button>
          </div>
        ) : null}
        {center.loading ? <p className="site-notification-state" role="status">{t("status.loading")}</p> : null}
        {!center.loading && !center.items.length && !center.error ? <p className="site-notification-state">{empty}</p> : null}
        {center.items.length ? (
          <ul className="site-notification-list">
            {center.items.map((item) => (
              <NotificationItem key={item.id} item={item} locale={locale} pending={center.openingId === item.id} onActivate={() => void center.activate(item)} />
            ))}
          </ul>
        ) : null}
        {center.nextCursor ? (
          <Button type="button" variant="secondary" fullWidth disabled={center.loadingMore} onClick={() => void center.loadMore()}>
            {center.loadingMore ? t("status.loadingMore") : t("actions.loadMore")}
          </Button>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {center.feedback === "markedAll" ? t("status.markedAll") : ""}
      </p>
    </dialog>
  );
}
