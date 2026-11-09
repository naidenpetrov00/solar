export const notificationPageSize = 20;
export const notificationUnreadMaximum = 99;
export const notificationKinds = ["order_created"] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const notificationFilters = ["unread", "all"] as const;
export type NotificationFilter = (typeof notificationFilters)[number];

export type NotificationUnreadSummary = {
  count: number;
  overflow: boolean;
};

export type NotificationNavigationTarget = {
  type: "dashboard_order_detail";
  orderId: string;
};

export type NotificationPresentationDto = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  readAt: string | null;
  titleKey: "items.orderCreated.title";
  bodyKey: "items.orderCreated.body";
  values: { orderNumber: string };
  target: NotificationNavigationTarget;
};

export type NotificationPageDto = {
  items: NotificationPresentationDto[];
  nextCursor: string | null;
  unread: NotificationUnreadSummary;
};

export type NotificationNavigationState = {
  eligible: boolean;
  unread: NotificationUnreadSummary;
};

export type NotificationMutationResult =
  | {
      status: "success";
      unread: NotificationUnreadSummary;
      target?: NotificationNavigationTarget;
    }
  | {
      status: "error";
      code: "FORBIDDEN" | "INVALID_INPUT" | "NOT_FOUND" | "TEMPORARY_FAILURE";
    };

export function isNotificationFilter(value: unknown): value is NotificationFilter {
  return (
    typeof value === "string" &&
    (notificationFilters as readonly string[]).includes(value)
  );
}
