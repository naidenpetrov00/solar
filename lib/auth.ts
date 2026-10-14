import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { authRoles } from "@/lib/auth-roles";
import { facebookSocialProvider } from "@/lib/facebook-auth";
import { googleSocialProvider } from "@/lib/google-auth";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email/auth-emails";
import {
  normalizeCustomerName,
  validateCustomerName,
} from "@/lib/auth-validation";
import { requireServerEnvironmentVariable } from "@/lib/server-env";

type UnknownRecord = Record<string, unknown>;

const ownerProtectedUserPaths = new Set([
  "/admin/set-role",
  "/admin/get-user",
  "/admin/update-user",
  "/admin/list-user-sessions",
  "/admin/unban-user",
  "/admin/ban-user",
  "/admin/impersonate-user",
  "/admin/revoke-user-sessions",
  "/admin/remove-user",
]);

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function includesRole(value: unknown, role: string): boolean {
  const roles = Array.isArray(value) ? value : [value];

  return roles.some(
    (candidate) =>
      typeof candidate === "string" &&
      candidate.split(",").some((item) => item.trim() === role),
  );
}

function throwAuthInvariantError(code: string, message: string): never {
  throw new APIError("FORBIDDEN", { code, message });
}

async function getUserRole(userId: unknown): Promise<string | null> {
  if (typeof userId !== "string" || !userId) {
    return null;
  }

  const [target] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return target?.role ?? null;
}

async function getSessionUserRole(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token) {
    return null;
  }

  const [target] = await db
    .select({ role: schema.user.role })
    .from(schema.session)
    .innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
    .where(eq(schema.session.token, token))
    .limit(1);

  return target?.role ?? null;
}

async function enforceManagementRequestInvariants(
  path: string,
  bodyValue: unknown,
  queryValue: unknown,
) {
  const body = asRecord(bodyValue) ?? {};
  const query = asRecord(queryValue) ?? {};

  if (path === "/admin/create-user") {
    const data = asRecord(body.data);
    const requestedRole = body.role ?? data?.role;

    if (includesRole(requestedRole, "admin")) {
      throwAuthInvariantError(
        "ADMIN_ROLE_CREATION_FORBIDDEN",
        "The owner role cannot be created through a management request.",
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "password")) {
      throwAuthInvariantError(
        "DIRECT_PASSWORD_MANAGEMENT_FORBIDDEN",
        "Management requests must use password-reset delivery.",
      );
    }

    return;
  }

  if (path === "/admin/set-user-password") {
    throwAuthInvariantError(
      "DIRECT_PASSWORD_MANAGEMENT_FORBIDDEN",
      "Management requests must use password-reset delivery.",
    );
  }

  if (path === "/admin/set-role" && includesRole(body.role, "admin")) {
    throwAuthInvariantError(
      "ADMIN_ROLE_ASSIGNMENT_FORBIDDEN",
      "The owner role cannot be assigned through a management request.",
    );
  }

  if (path === "/admin/update-user") {
    const data = asRecord(body.data);

    if (includesRole(data?.role, "admin")) {
      throwAuthInvariantError(
        "ADMIN_ROLE_ASSIGNMENT_FORBIDDEN",
        "The owner role cannot be assigned through a management request.",
      );
    }
  }

  let targetRole: string | null = null;

  if (ownerProtectedUserPaths.has(path)) {
    targetRole = await getUserRole(
      path === "/admin/get-user" ? query.id : body.userId,
    );
  } else if (path === "/admin/revoke-user-session") {
    targetRole = await getSessionUserRole(body.sessionToken);
  }

  if (targetRole === "admin") {
    throwAuthInvariantError(
      "OWNER_ACCOUNT_PROTECTED",
      "Management endpoints cannot target the owner account.",
    );
  }
}

export const auth = betterAuth({
  appName: "Solar",
  baseURL: requireServerEnvironmentVariable("BETTER_AUTH_URL"),
  secret: requireServerEnvironmentVariable("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    validateUserInfo: ({ user, source }) => {
      const isPublicRegistration =
        source.action === "create-user" &&
        (source.method === "email-password" || source.method === "oauth");

      if (
        isPublicRegistration &&
        user.role !== undefined &&
        user.role !== "customer"
      ) {
        return {
          error: "public_role_assignment_forbidden",
          errorDescription: "Public registration cannot assign account roles.",
        };
      }
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
    onPasswordReset: async ({ user }) => {
      try {
        const [administrator] = await db
          .select({
            role: schema.user.role,
            emailVerified: schema.user.emailVerified,
          })
          .from(schema.user)
          .where(eq(schema.user.id, user.id))
          .limit(1);

        if (
          administrator?.role !== "administrator" ||
          administrator.emailVerified
        ) {
          return;
        }

        await db
          .update(schema.user)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(
            and(
              eq(schema.user.id, user.id),
              eq(schema.user.role, "administrator"),
              eq(schema.user.emailVerified, false),
            ),
          );
      } catch {
        // Password setup has already succeeded at this point. Do not throw:
        // Better Auth must still revoke every existing session. The account
        // remains unverified and can recover through verification-email resend.
        console.error({
          event: "administrator_email_verification_after_reset_failed",
        });
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders:
    googleSocialProvider || facebookSocialProvider
      ? {
          ...(googleSocialProvider ? { google: googleSocialProvider } : {}),
          ...(facebookSocialProvider ? { facebook: facebookSocialProvider } : {}),
        }
      : undefined,
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const body = ctx.body as
          | { name?: unknown; role?: unknown }
          | undefined;

        if (
          body &&
          Object.prototype.hasOwnProperty.call(body, "role")
        ) {
          throw new APIError("BAD_REQUEST", {
            code: "PUBLIC_ROLE_ASSIGNMENT_FORBIDDEN",
            message: "Public registration cannot assign account roles.",
          });
        }

        const name = normalizeCustomerName(
          typeof body?.name === "string" ? body.name : "",
        );

        if (validateCustomerName(name)) {
          throw new APIError("BAD_REQUEST", {
            code: "INVALID_CUSTOMER_NAME",
            message: "The supplied customer name is invalid.",
          });
        }

        return {
          context: {
            body: {
              ...ctx.body,
              name,
            },
          },
        };
      }

      const isRequestlessServerCall = !ctx.request && !ctx.headers;

      if (isRequestlessServerCall || !ctx.path.startsWith("/admin/")) {
        return;
      }

      await enforceManagementRequestInvariants(ctx.path, ctx.body, ctx.query);
    }),
  },
  plugins: [
    admin({
      roles: authRoles,
      defaultRole: "customer",
      adminRoles: ["admin"],
    }),
  ],
});
