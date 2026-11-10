import "server-only";

import { and, desc, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "@/db";
import { userNotification } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/authorization";
import { isUuid } from "@/lib/catalog/model";
import { InAppNotificationError } from "@/lib/in-app-notifications/errors";
import {
  notificationPageSize,
  type NotificationFilter,
  type NotificationNavigationState,
  type NotificationPageDto,
} from "@/lib/in-app-notifications/model";
import {
  notificationIdentityCondition,
  unreadSummaryFor,
} from "@/lib/in-app-notifications/repository";
import {
  authorizedNotificationIdentities,
  presentStoredNotification,
} from "@/lib/in-app-notifications/registry";
import { AuthorizationError } from "@/lib/permission-policy";

type NotificationCursor = { createdAt: Date; id: string };

function encodeCursor(cursor: NotificationCursor) {
  return Buffer.from(
    JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }),
  ).toString("base64url");
}

function decodeCursor(value: string): NotificationCursor {
  if (!value || value.length > 256) {
    throw new InAppNotificationError("INVALID_INPUT");
  }
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const createdAt = new Date(decoded.createdAt);
    if (
      typeof decoded.createdAt !== "string" ||
      createdAt.toISOString() !== decoded.createdAt ||
      typeof decoded.id !== "string" ||
      !isUuid(decoded.id)
    ) {
      throw new Error("invalid cursor");
    }
    return { createdAt, id: decoded.id };
  } catch {
    throw new InAppNotificationError("INVALID_INPUT");
  }
}

async function notificationViewer() {
  const currentUser = await requireUser();
  if (!authorizedNotificationIdentities(currentUser.role).length) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }
  return currentUser;
}

export async function getNotificationNavigationState(): Promise<NotificationNavigationState> {
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !authorizedNotificationIdentities(currentUser.role).length
  ) {
    return { eligible: false, unread: { count: 0, overflow: false } };
  }
  return {
    eligible: true,
    unread: await unreadSummaryFor(db, currentUser.id, currentUser.role),
  };
}

export async function getNotificationUnreadSummary() {
  const currentUser = await notificationViewer();
  return unreadSummaryFor(db, currentUser.id, currentUser.role);
}

export async function listCurrentUserNotifications(
  filter: NotificationFilter,
  cursorValue?: string,
): Promise<NotificationPageDto> {
  const currentUser = await notificationViewer();
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  return db.transaction(async (transaction) => {
    const cursorCondition = cursor
      ? or(
          lt(userNotification.createdAt, cursor.createdAt),
          and(
            eq(userNotification.createdAt, cursor.createdAt),
            lt(userNotification.id, cursor.id),
          ),
        )
      : undefined;
    const rows = await transaction
      .select()
      .from(userNotification)
      .where(
        and(
          eq(userNotification.recipientUserId, currentUser.id),
          notificationIdentityCondition(currentUser.role),
          filter === "unread" ? isNull(userNotification.readAt) : undefined,
          cursorCondition,
        ),
      )
      .orderBy(desc(userNotification.createdAt), desc(userNotification.id))
      .limit(notificationPageSize + 1);
    const pageRows = rows.slice(0, notificationPageSize);
    const last = pageRows.at(-1);
    return {
      items: pageRows.map((row) =>
        presentStoredNotification(row, currentUser.role),
      ),
      nextCursor:
        rows.length > notificationPageSize && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.id })
          : null,
      unread: await unreadSummaryFor(
        transaction,
        currentUser.id,
        currentUser.role,
      ),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
