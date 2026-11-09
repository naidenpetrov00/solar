import { NextResponse } from "next/server";

import { InAppNotificationError } from "@/lib/in-app-notifications/errors";
import { isNotificationFilter } from "@/lib/in-app-notifications/model";
import { listCurrentUserNotifications } from "@/lib/in-app-notifications/read";
import { AuthorizationError } from "@/lib/permission-policy";

const responseHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const filter = parameters.get("filter");
  const cursor = parameters.get("cursor");
  if (
    !isNotificationFilter(filter) ||
    parameters.getAll("filter").length !== 1 ||
    parameters.getAll("cursor").length > 1 ||
    cursor === ""
  ) {
    return new Response(null, { status: 400, headers: responseHeaders });
  }
  try {
    const result = await listCurrentUserNotifications(
      filter,
      cursor ?? undefined,
    );
    return NextResponse.json(result, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return new Response(null, { status: error.status, headers: responseHeaders });
    }
    if (
      error instanceof InAppNotificationError &&
      error.code === "INVALID_INPUT"
    ) {
      return new Response(null, { status: 400, headers: responseHeaders });
    }
    console.error({ event: "in_app_notification_list_failed" });
    return new Response(null, { status: 500, headers: responseHeaders });
  }
}
