import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AuthorizationError,
  hasPermission,
  type AppPermission,
} from "@/lib/permission-policy";

export type CurrentUser = typeof auth.$Infer.Session.user;

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("AUTHENTICATION_REQUIRED", 401);
  }

  return user;
}
export async function requirePermission(
  permission: AppPermission,
): Promise<CurrentUser> {
  const user = await requireUser();

  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }

  return user;
}
