import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertCanCreateRole } from "@/lib/permission-policy";
import { assertCurrentActorRole } from "@/lib/user-management-access";
import { UserManagementError } from "@/lib/user-management-model";

function apiErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if (
    "body" in error &&
    typeof error.body === "object" &&
    error.body !== null &&
    "code" in error.body &&
    typeof error.body.code === "string"
  ) {
    return error.body.code;
  }
}

export async function createAdministrator(input: {
  actorId: string;
  name: string;
  email: string;
  requestHeaders: Headers;
}) {
  const [actor] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, input.actorId))
    .limit(1);

  if (!actor) {
    throw new UserManagementError("FORBIDDEN");
  }

  assertCurrentActorRole(actor.role);

  try {
    assertCanCreateRole(actor.role, "administrator");
  } catch {
    throw new UserManagementError("FORBIDDEN");
  }

  try {
    const result = await auth.api.createUser({
      body: {
        name: input.name,
        email: input.email,
        role: "administrator",
      },
      headers: input.requestHeaders,
    });

    if (!result.user || result.user.role !== "administrator") {
      throw new UserManagementError("INVALID_INPUT");
    }

    return result.user;
  } catch (error) {
    if (error instanceof UserManagementError) {
      throw error;
    }

    if (apiErrorCode(error) === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      throw new UserManagementError("EMAIL_EXISTS");
    }

    throw new UserManagementError("INVALID_INPUT");
  }
}
