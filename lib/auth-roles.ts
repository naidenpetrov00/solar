import {
  adminAc,
  userAc,
} from "better-auth/plugins/admin/access";

export const appRoles = ["customer", "admin"] as const;

export type AppRole = (typeof appRoles)[number];

export const authRoles = {
  customer: userAc,
  admin: adminAc,
} as const;
