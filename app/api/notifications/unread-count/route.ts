import { NextResponse } from "next/server";

import { getNotificationUnreadSummary } from "@/lib/in-app-notifications/read";
import { AuthorizationError } from "@/lib/permission-policy";

const responseHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const unread = await getNotificationUnreadSummary();
    return NextResponse.json({ unread }, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new Response(null, { status: error.status, headers: responseHeaders });
    }
    console.error({ event: "in_app_notification_count_failed" });
    return new Response(null, { status: 500, headers: responseHeaders });
  }
}
