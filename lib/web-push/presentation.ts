import "server-only";

import { createHash } from "node:crypto";

import { getT } from "@/i18n.server";
import { presentStoredPushNotification } from "@/lib/in-app-notifications/registry";

type StoredNotification = Parameters<typeof presentStoredPushNotification>[0];

function targetPath(
  target: { type: "dashboard_order_detail"; orderId: string },
  locale: string,
) {
  const slug = `dashboard/orders/${target.orderId}`;
  return locale === "bg" ? `/${slug}` : `/${locale}/${slug}`;
}

export async function composeWebPushPayload(
  notification: StoredNotification,
  role: unknown,
  locale: string,
) {
  const push = presentStoredPushNotification(notification, role);
  const { t } = await getT("notifications", { lng: locale });
  const tag = `notification:${notification.id}`;
  return {
    payload: JSON.stringify({
      version: 1,
      title: t(push.titleKey),
      body: t(push.bodyKey),
      tag,
      targetPath: targetPath(push.presentation.target, locale),
    }),
    topic: createHash("sha256")
      .update(notification.id, "utf8")
      .digest("base64url")
      .slice(0, 32),
  };
}
