import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { authRoles } from "@/lib/auth-roles";
import {
  normalizeCustomerName,
  validateCustomerName,
} from "@/lib/auth-validation";
import { requireServerEnvironmentVariable } from "@/lib/server-env";

export const auth = betterAuth({
  appName: "Solar",
  baseURL: requireServerEnvironmentVariable("BETTER_AUTH_URL"),
  secret: requireServerEnvironmentVariable("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }

      const body = ctx.body as { name?: unknown } | undefined;
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
