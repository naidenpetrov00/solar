import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

import * as schema from "@/db/schema";

const schemaCheckDatabase = {} as Parameters<typeof drizzleAdapter>[0];

export const auth = betterAuth({
  database: drizzleAdapter(schemaCheckDatabase, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
  },
  plugins: [
    admin({
      roles: {
        customer: userAc,
        admin: adminAc,
      },
      defaultRole: "customer",
      adminRoles: ["admin"],
    }),
  ],
});
