import type { ManageableRole } from "@/lib/permission-policy";

export const USERS_PAGE_SIZE = 25;
export const USERS_MAX_PAGE = 10_000;
export const USERS_SEARCH_MAX_LENGTH = 100;
export const MANAGEMENT_EMAIL_COOLDOWN_MS = 60_000;

export type ManagedUserAction =
  | "block"
  | "unblock"
  | "revoke-sessions"
  | "send-password-reset"
  | "promote"
  | "demote";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ManageableRole;
  emailVerified: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  actions: ManagedUserAction[];
};

export type ManagedUsersPage = {
  users: ManagedUser[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
};

export type UserManagementErrorCode =
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "STALE"
  | "RATE_LIMITED"
  | "EMAIL_EXISTS"
  | "DELIVERY_FAILED";

export class UserManagementError extends Error {
  constructor(readonly code: UserManagementErrorCode) {
    super(code);
    this.name = "UserManagementError";
  }
}
