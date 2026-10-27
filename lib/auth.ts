import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
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
import { enforceManagementRequestInvariants } from "@/lib/auth-management-guard";
import { verifyAdministratorAfterPasswordReset } from "@/lib/auth-reset-verification";

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
    onPasswordReset: ({ user }) =>
      verifyAdministratorAfterPasswordReset(user.id),
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
          ...(facebookSocialProvider
            ? { facebook: facebookSocialProvider }
            : {}),
        }
      : undefined,
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const body = ctx.body as { name?: unknown; role?: unknown } | undefined;

        if (body && Object.prototype.hasOwnProperty.call(body, "role")) {
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
