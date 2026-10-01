import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { authRoles } from "@/lib/auth-roles";
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
    disableSignUp: true,
  },
  plugins: [
    admin({
      roles: authRoles,
      defaultRole: "customer",
      adminRoles: ["admin"],
    }),
  ],
});
