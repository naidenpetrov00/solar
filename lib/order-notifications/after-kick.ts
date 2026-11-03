import "server-only";

import { after } from "next/server";

import { kickOrderNotificationDispatcher } from "@/lib/order-notifications/dispatcher";

export function scheduleOrderNotificationDispatch() {
  try {
    after(async () => {
      await kickOrderNotificationDispatcher();
    });
  } catch {
    console.error({ event: "order_notification_dispatch_schedule_failed" });
  }
}
