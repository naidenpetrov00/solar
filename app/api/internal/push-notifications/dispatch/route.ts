import { authenticateWebPushDispatcher } from "@/lib/web-push/dispatcher-auth";
import { dispatchWebPushNotifications } from "@/lib/web-push/dispatcher";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    if (!authenticateWebPushDispatcher(request)) {
      return new Response(null, { status: 401, headers });
    }
  } catch {
    return new Response(null, { status: 500, headers });
  }
  try {
    await dispatchWebPushNotifications();
    return new Response(null, { status: 204, headers });
  } catch {
    console.error({ event: "web_push_dispatch_batch_failed" });
    return new Response(null, { status: 500, headers });
  }
}
