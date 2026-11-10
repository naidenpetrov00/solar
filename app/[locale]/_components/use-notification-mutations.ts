"use client";

import { useState } from "react";

import type {
  NotificationMutationResult,
  NotificationNavigationTarget,
  NotificationPresentationDto,
  NotificationUnreadSummary,
} from "@/lib/in-app-notifications/model";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./notification-actions";

export type NotificationClientError = Extract<
  NotificationMutationResult,
  { status: "error" }
>["code"];

export function useNotificationMutations(input: {
  setError: (error: NotificationClientError | null) => void;
  setUnread: (unread: NotificationUnreadSummary) => void;
  resetPage: () => Promise<void>;
  close: () => void;
  navigate: (target: NotificationNavigationTarget) => void;
  onForbidden: () => void;
}) {
  const [markingAll, setMarkingAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const markAll = async () => {
    setMarkingAll(true);
    input.setError(null);
    setFeedback(null);
    try {
      const result = await markAllNotificationsReadAction();
      if (result.status === "error") {
        if (result.code === "FORBIDDEN") input.onForbidden();
        else input.setError(result.code);
      }
      else {
        input.setUnread(result.unread);
        setFeedback("markedAll");
        await input.resetPage();
      }
    } catch {
      input.setError("TEMPORARY_FAILURE");
    } finally {
      setMarkingAll(false);
    }
  };

  const activate = async (item: NotificationPresentationDto) => {
    setOpeningId(item.id);
    input.setError(null);
    try {
      const result = await markNotificationReadAction(item.id);
      if (result.status === "error") {
        if (result.code === "FORBIDDEN") input.onForbidden();
        else input.setError(result.code);
        return;
      }
      if (!result.target) {
        input.setError("TEMPORARY_FAILURE");
        return;
      }
      input.setUnread(result.unread);
      input.close();
      input.navigate(result.target);
    } catch {
      input.setError("TEMPORARY_FAILURE");
    } finally {
      setOpeningId(null);
    }
  };

  return { markingAll, openingId, feedback, markAll, activate };
}
