import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type CurrentUser = typeof auth.$Infer.Session.user;

export type AuthorizationErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ADMIN_REQUIRED";

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;
  readonly status: 401 | 403;

  constructor(code: AuthorizationErrorCode, status: 401 | 403) {
    super(code);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = status;
  }
}

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

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new AuthorizationError("ADMIN_REQUIRED", 403);
  }

  return user;
}
