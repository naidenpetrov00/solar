import "server-only";

import { after } from "next/server";

import { kickWebPushDispatcher } from "@/lib/web-push/dispatcher";

export function scheduleWebPushDispatch() {
  try {
    after(kickWebPushDispatcher);
  } catch {
    console.error({ event: "web_push_dispatch_schedule_failed" });
  }
}
