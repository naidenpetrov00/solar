"use client";

import { useEffect } from "react";

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function useNotificationPolling(
  enabled: boolean,
  refresh: (silent?: boolean) => Promise<void>,
  abortActiveRequest: () => void,
) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let refreshSequence = 0;
    let activeRefresh: Promise<void> | null = null;

    const refreshSafely = () => {
      if (activeRefresh) return activeRefresh;
      activeRefresh = (async () => {
        try {
          await refresh(true);
        } catch (error) {
          if (!isAbortError(error)) {
            console.error({ event: "in_app_notification_poll_failed" });
          }
        } finally {
          activeRefresh = null;
        }
      })();
      return activeRefresh;
    };

    const schedule = () => {
      if (!active || document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = undefined;
        await refreshSafely();
        schedule();
      }, 30_000);
    };
    const refreshNow = async () => {
      const sequence = ++refreshSequence;
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (document.visibilityState !== "visible") {
        abortActiveRequest();
        return;
      }
      await refreshSafely();
      if (sequence === refreshSequence) schedule();
    };
    const onVisibility = () => void refreshNow();
    const onFocus = () => void refreshNow();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    schedule();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      abortActiveRequest();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [abortActiveRequest, enabled, refresh]);
}
