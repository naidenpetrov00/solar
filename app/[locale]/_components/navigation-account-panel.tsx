import Link from "next/link";
import type { RefObject } from "react";
import { Button } from "@/components/button";
import { localizedPath } from "../_lib/routes";
import type { NavigationProps, NavigationUser } from "./navigation-model";

type AccountLabels = Pick<
  NavigationProps,
  | "accountMenuLabel"
  | "canViewDashboard"
  | "dashboardNavigationLabel"
  | "dashboardLabel"
  | "signingOutLabel"
  | "signOutLabel"
>;

export function NavigationAccountPanel({
  user,
  locale,
  activeSlug,
  profilePanelRef,
  closeMenus,
  logoutError,
  logoutPending,
  onSignOut,
  accountMenuLabel,
  canViewDashboard,
  dashboardNavigationLabel,
  dashboardLabel,
  signingOutLabel,
  signOutLabel,
}: AccountLabels & {
  user: NavigationUser;
  locale: string;
  activeSlug: string;
  profilePanelRef: RefObject<HTMLDivElement | null>;
  closeMenus: () => void;
  logoutError: string | null;
  logoutPending: boolean;
  onSignOut: () => void;
}) {
  return (
    <div
      ref={profilePanelRef}
      id="account-menu"
      className="site-account-panel absolute right-5 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2.5rem))] border p-4 sm:right-8 xl:right-8"
      role="group"
      aria-label={accountMenuLabel}
    >
      <div className="border-b pb-4">
        <p className="m-0 break-words text-sm font-semibold tracking-[-0.015em]">
          {user.name}
        </p>
        <p className="site-account-email m-0 mt-1 break-all text-sm">
          {user.email}
        </p>
      </div>
      {canViewDashboard ? (
        <nav
          className="site-account-dashboard-navigation border-b py-3"
          aria-label={dashboardNavigationLabel}
        >
          <Link
            className="site-account-dashboard flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            href={localizedPath(locale, "dashboard")}
            aria-current={
              activeSlug === "dashboard"
                ? "page"
                : activeSlug.startsWith("dashboard/")
                  ? "location"
                  : undefined
            }
            onClick={closeMenus}
          >
            <span>{dashboardLabel}</span>
            <svg
              aria-hidden="true"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14M14 7l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </nav>
      ) : null}
      {logoutError ? (
        <p className="site-account-error" role="alert">
          {logoutError}
        </p>
      ) : null}
      <Button
        type="button"
        className="site-account-logout mt-4"
        fullWidth
        variant="secondary"
        onClick={onSignOut}
        disabled={logoutPending}
      >
        {logoutPending ? signingOutLabel : signOutLabel}
      </Button>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {logoutPending ? signingOutLabel : ""}
      </p>
    </div>
  );
}
