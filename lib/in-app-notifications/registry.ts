import "server-only";

import { isUuid } from "@/lib/catalog/model";
import { InAppNotificationError } from "@/lib/in-app-notifications/errors";
import type {
  NotificationKind,
  NotificationPresentationDto,
} from "@/lib/in-app-notifications/model";
import {
  hasPermission,
  type AppPermission,
} from "@/lib/permission-policy";

type StoredNotification = {
  id: string;
  kind: string;
  payloadVersion: number;
  payload: unknown;
  createdAt: Date;
  readAt: Date | null;
};

type NotificationIdentity = {
  kind: NotificationKind;
  payloadVersion: number;
};

type RegistryEntry = NotificationIdentity & {
  permission: AppPermission;
  present: (row: StoredNotification) => NotificationPresentationDto;
};

function orderCreatedPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (
    Object.keys(payload).length !== 2 ||
    typeof payload.orderId !== "string" ||
    !isUuid(payload.orderId) ||
    typeof payload.orderNumber !== "string" ||
    !/^ORD-[0-9]{6,}$/u.test(payload.orderNumber)
  ) {
    return null;
  }
  return { orderId: payload.orderId, orderNumber: payload.orderNumber };
}

const orderCreated: RegistryEntry = {
  kind: "order_created",
  payloadVersion: 1,
  permission: "order:view",
  present(row) {
    const payload = orderCreatedPayload(row.payload);
    if (!payload) {
      throw new InAppNotificationError("INVALID_STORED_NOTIFICATION");
    }
    return {
      id: row.id,
      kind: "order_created",
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      titleKey: "items.orderCreated.title",
      bodyKey: "items.orderCreated.body",
      values: { orderNumber: payload.orderNumber },
      target: { type: "dashboard_order_detail", orderId: payload.orderId },
    };
  },
};

const notificationRegistry = {
  order_created: orderCreated,
} satisfies Record<NotificationKind, RegistryEntry>;

const notificationEntries = Object.values(notificationRegistry);

export function authorizedNotificationIdentities(role: unknown) {
  return notificationEntries
    .filter((entry) => hasPermission(role, entry.permission))
    .map(({ kind, payloadVersion }) => ({ kind, payloadVersion }));
}

export function presentStoredNotification(
  row: StoredNotification,
  role: unknown,
) {
  const entry = notificationEntries.find(
    (candidate) =>
      candidate.kind === row.kind &&
      candidate.payloadVersion === row.payloadVersion,
  );
  if (!entry || !hasPermission(role, entry.permission)) {
    throw new InAppNotificationError("FORBIDDEN");
  }
  return entry.present(row);
}

export function createOrderCreatedPayload(orderId: string, orderNumber: string) {
  const payload = orderCreatedPayload({ orderId, orderNumber });
  if (!payload) throw new InAppNotificationError("INVALID_INPUT");
  return payload;
}
