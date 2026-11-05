import { authenticateOrderNotificationDispatcher } from "@/lib/order-notifications/dispatcher-auth";
import { dispatchOrderNotifications } from "@/lib/order-notifications/dispatcher";

export const runtime = "nodejs";

const responseHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let authenticated: boolean;
  try {
    authenticated = authenticateOrderNotificationDispatcher(request);
  } catch {
    return new Response(null, { status: 500, headers: responseHeaders });
  }
  if (!authenticated) {
    return new Response(null, { status: 401, headers: responseHeaders });
  }
  try {
    await dispatchOrderNotifications();
    return new Response(null, { status: 204, headers: responseHeaders });
  } catch {
    console.error({ event: "order_notification_dispatch_batch_failed" });
    return new Response(null, { status: 500, headers: responseHeaders });
  }
}
