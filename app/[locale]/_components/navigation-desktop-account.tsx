import { Button, ButtonLink } from "@/components/button";
import type { NavigationProps } from "./navigation-model";
export function NavigationDesktopAccount({
  user,
  profileOpen,
  closeAccountMenuLabel,
  openAccountMenuLabel,
  toggleProfile,
  accountLabel,
  signInHref,
  signUpHref,
  signInLabel,
  signUpLabel,
}: {
  user: NavigationProps["user"];
  profileOpen: boolean;
  closeAccountMenuLabel: string;
  openAccountMenuLabel: string;
  toggleProfile: (trigger: HTMLButtonElement) => void;
  accountLabel: string;
  signInHref: string;
  signUpHref: string;
  signInLabel: string;
  signUpLabel: string;
}) {
  return (
    <>
      {user ? (
        <Button
          type="button"
          className="site-account-trigger"
          variant="secondary"
          aria-controls="account-menu"
          aria-expanded={profileOpen}
          aria-label={
            profileOpen ? closeAccountMenuLabel : openAccountMenuLabel
          }
          onClick={(event) => toggleProfile(event.currentTarget)}
        >
          <svg
            aria-hidden="true"
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="8"
              r="3.25"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M5 20c.9-3.2 3.3-5 7-5s6.1 1.8 7 5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
          <span>{accountLabel}</span>
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <ButtonLink
            className="site-auth-link"
            variant="informational"
            href={signInHref}
          >
            {signInLabel}
          </ButtonLink>
          <ButtonLink
            className="site-auth-link site-auth-link-outlined"
            variant="secondary"
            href={signUpHref}
          >
            {signUpLabel}
          </ButtonLink>
        </div>
      )}
    </>
  );
}
