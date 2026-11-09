"use server";

import { InAppNotificationError } from "@/lib/in-app-notifications/errors";
import type { NotificationMutationResult } from "@/lib/in-app-notifications/model";
import {
  markAllCurrentUserNotificationsRead,
  markCurrentUserNotificationRead,
} from "@/lib/in-app-notifications/mutations";
import { AuthorizationError } from "@/lib/permission-policy";

function actionError(error: unknown): NotificationMutationResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN" };
  }
  if (error instanceof InAppNotificationError) {
    if (error.code === "INVALID_INPUT" || error.code === "NOT_FOUND") {
      return { status: "error", code: error.code };
    }
    if (error.code === "FORBIDDEN") {
      return { status: "error", code: "FORBIDDEN" };
    }
  }
  return { status: "error", code: "TEMPORARY_FAILURE" };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationMutationResult> {
  try {
    const result = await markCurrentUserNotificationRead(notificationId);
    return { status: "success", ...result };
  } catch (error) {
    return actionError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationMutationResult> {
  try {
    const unread = await markAllCurrentUserNotificationsRead();
    return { status: "success", unread };
  } catch (error) {
    return actionError(error);
  }
}
