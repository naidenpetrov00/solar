import type {
  NotificationFilter,
  NotificationPageDto,
  NotificationUnreadSummary,
} from "@/lib/in-app-notifications/model";

export class NotificationAccessError extends Error {}

async function checkedJson<T>(response: Response): Promise<T> {
  if (response.status === 401 || response.status === 403) {
    throw new NotificationAccessError();
  }
  if (!response.ok) throw new Error("notification request failed");
  return response.json() as Promise<T>;
}

export async function fetchNotificationPage(
  filter: NotificationFilter,
  cursor: string | null,
  signal: AbortSignal,
) {
  const parameters = new URLSearchParams({ filter });
  if (cursor) parameters.set("cursor", cursor);
  const response = await fetch(`/api/notifications?${parameters}`, {
    cache: "no-store",
    signal,
  });
  return checkedJson<NotificationPageDto>(response);
}

export async function fetchNotificationUnread(signal: AbortSignal) {
  const response = await fetch("/api/notifications/unread-count", {
    cache: "no-store",
    signal,
  });
  const result = await checkedJson<{ unread: NotificationUnreadSummary }>(response);
  return result.unread;
}
