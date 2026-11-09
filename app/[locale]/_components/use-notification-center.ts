"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  NotificationFilter,
  NotificationPresentationDto,
  NotificationUnreadSummary,
} from "@/lib/in-app-notifications/model";
import { dashboardOrderRouteSlug, localizedPath } from "../_lib/routes";
import {
  fetchNotificationPage,
  fetchNotificationUnread,
  NotificationAccessError,
} from "./notification-client";
import {
  useNotificationMutations,
  type NotificationClientError,
} from "./use-notification-mutations";
import { useNotificationPolling } from "./use-notification-polling";
import type { WebPushPublicConfig } from "@/lib/web-push/model";
import { useBrowserPush } from "./use-browser-push";

type LoadMode = "reset" | "refresh" | "append";
function aborted(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function useNotificationCenter(
  locale: string,
  initialUnread?: NotificationUnreadSummary,
  webPushConfig?: WebPushPublicConfig,
) {
  const router = useRouter();
  const browserPush = useBrowserPush(locale, webPushConfig);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const enabled = initialUnread !== undefined && !accessRevoked;
  const [open, setOpen] = useState(false);
  const [filter, setFilterState] = useState<NotificationFilter>("unread");
  const [items, setItems] = useState<NotificationPresentationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(
    initialUnread ?? { count: 0, overflow: false },
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<NotificationClientError | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const loadedMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);
  const restoreFocusRef = useRef(true);

  const revokeAccess = useCallback(() => {
    setAccessRevoked(true);
    setOpen(false);
    setItems([]);
    setUnread({ count: 0, overflow: false });
    void browserPush.cleanupForLogout();
  }, [browserPush.cleanupForLogout]);

  useEffect(() => {
    if (initialUnread) {
      setUnread(initialUnread);
      setAccessRevoked(false);
    }
  }, [initialUnread]);

  const abortActiveRequest = useCallback(() => {
    const controller = requestRef.current;
    requestRef.current = null;
    if (controller && !controller.signal.aborted) controller.abort();
  }, []);

  const beginRequest = useCallback(() => {
    abortActiveRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    requestVersion.current += 1;
    return { controller, version: requestVersion.current };
  }, [abortActiveRequest]);

  const loadPage = useCallback(async (mode: LoadMode, silent = false) => {
    if (!enabled) return;
    const cursor = mode === "append" ? nextCursorRef.current : null;
    if (mode === "append" && !cursor) return;
    const { controller, version } = beginRequest();
    if (!silent) {
      setError(null);
      if (mode === "append") setLoadingMore(true);
      else if (mode === "reset") setLoading(true);
    }
    try {
      const page = await fetchNotificationPage(filter, cursor, controller.signal);
      if (version !== requestVersion.current) return;
      setUnread(page.unread);
      setItems((current) => {
        if (mode === "reset") return page.items;
        if (mode === "append") {
          const known = new Set(current.map(({ id }) => id));
          return [...current, ...page.items.filter(({ id }) => !known.has(id))];
        }
        if (!loadedMoreRef.current) return page.items;
        const incoming = new Set(page.items.map(({ id }) => id));
        const tail = current.filter(
          (item) =>
            !incoming.has(item.id) && (filter === "all" || item.readAt === null),
        );
        return [...page.items, ...tail];
      });
      if (mode === "append") loadedMoreRef.current = true;
      if (mode !== "refresh" || !loadedMoreRef.current) {
        nextCursorRef.current = page.nextCursor;
        setNextCursor(page.nextCursor);
      }
    } catch (caught) {
      if (caught instanceof NotificationAccessError) revokeAccess();
      else if (!aborted(caught) && !silent) setError("TEMPORARY_FAILURE");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (version === requestVersion.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [beginRequest, enabled, filter, revokeAccess]);

  const loadCount = useCallback(async (silent = true) => {
    if (!enabled) return;
    const { controller, version } = beginRequest();
    try {
      const result = await fetchNotificationUnread(controller.signal);
      if (version === requestVersion.current) setUnread(result);
    } catch (caught) {
      if (caught instanceof NotificationAccessError) revokeAccess();
      else if (!aborted(caught) && !silent) setError("TEMPORARY_FAILURE");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, [beginRequest, enabled, revokeAccess]);

  const refresh = useCallback(
    (silent = true) => (open ? loadPage("refresh", silent) : loadCount(silent)),
    [loadCount, loadPage, open],
  );
  useEffect(() => {
    if (!open) return;
    loadedMoreRef.current = false;
    setItems([]);
    nextCursorRef.current = null;
    setNextCursor(null);
    void loadPage("reset");
  }, [filter, loadPage, open]);

  useNotificationPolling(enabled, refresh, abortActiveRequest);

  const close = useCallback(() => {
    restoreFocusRef.current = true;
    setOpen(false);
  }, []);
  const closeWithoutFocus = useCallback(() => {
    restoreFocusRef.current = false;
    setOpen(false);
  }, []);
  const toggle = (trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    restoreFocusRef.current = true;
    setOpen((current) => !current);
  };
  const setFilter = (next: NotificationFilter) => {
    if (next === filter) return;
    abortActiveRequest();
    setFilterState(next);
  };
  const resetPage = useCallback(() => {
    loadedMoreRef.current = false;
    nextCursorRef.current = null;
    setItems([]);
    setNextCursor(null);
    return loadPage("reset");
  }, [loadPage]);
  const mutations = useNotificationMutations({
    setError,
    setUnread,
    resetPage,
    close: closeWithoutFocus,
    onForbidden: revokeAccess,
    navigate: (target) => {
      if (target.type === "dashboard_order_detail") {
        router.push(localizedPath(locale, dashboardOrderRouteSlug(target.orderId)));
      }
    },
  });

  return {
    enabled, open, close, closeWithoutFocus, toggle, triggerRef,
    restoreFocusRef, filter, setFilter, items,
    nextCursor, unread, loading, loadingMore, error,
    ...mutations,
    loadMore: () => loadPage("append"),
    retry: resetPage,
    browserPush,
  };
}
