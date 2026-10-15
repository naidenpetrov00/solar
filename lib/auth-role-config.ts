import {
  defaultAc,
  userAc,
} from "better-auth/plugins/admin/access";

export const appRoles = ["customer", "administrator", "admin"] as const;

export type AppRole = (typeof appRoles)[number];

const ownerAc = defaultAc.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "delete",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

/**
 * Better Auth's operation permissions are not target-aware. Administrators
 * therefore use the application permission layer instead of the plugin's
 * generic management endpoints.
 */
export const authRoles = {
  customer: userAc,
  administrator: userAc,
  admin: ownerAc,
} as const;
