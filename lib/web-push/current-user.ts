import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/authorization";
import { authorizedPushNotificationIdentities } from "@/lib/in-app-notifications/registry";
import { AuthorizationError } from "@/lib/permission-policy";

export async function requireCurrentPushUser(options?: {
  allowWithoutPermission?: boolean;
}) {
  const sessionUser = await requireUser();
  const [stored] = await db
    .select({ id: user.id, role: user.role, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);
  if (!stored) throw new AuthorizationError("AUTHENTICATION_REQUIRED", 401);
  const banned =
    stored.banned === true &&
    (!stored.banExpires || stored.banExpires.getTime() > Date.now());
  if (
    banned ||
    (!options?.allowWithoutPermission &&
      !authorizedPushNotificationIdentities(stored.role).length)
  ) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }
  return stored;
}
