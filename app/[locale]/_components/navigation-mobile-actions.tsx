import Link from "next/link";
import { Button } from "@/components/button";
import { localizedPath } from "../_lib/routes";
import type { NavigationProps } from "./navigation-model";

type MobileActionLabels = Pick<
  NavigationProps,
  | "openAccountMenuLabel"
  | "closeAccountMenuLabel"
  | "cartLabel"
  | "menuLabel"
  | "closeMenuLabel"
>;

export function NavigationMobileActions({
  signedIn,
  profileOpen,
  openAccountMenuLabel,
  closeAccountMenuLabel,
  toggleProfile,
  ready,
  count,
  cartLabel,
  locale,
  activeSlug,
  closeMenus,
  menuOpen,
  menuLabel,
  closeMenuLabel,
  setMenuOpen,
  setProfileOpen,
}: MobileActionLabels & {
  signedIn: boolean;
  profileOpen: boolean;
  toggleProfile: (trigger: HTMLButtonElement) => void;
  ready: boolean;
  count: number;
  locale: string;
  activeSlug: string;
  closeMenus: () => void;
  menuOpen: boolean;
  setMenuOpen: (update: (open: boolean) => boolean) => void;
  setProfileOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 xl:hidden">
      {signedIn ? (
        <Button
          type="button"
          className="site-account-trigger size-11"
          size="icon"
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
            className="size-5"
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
        </Button>
      ) : null}
      <Link
        className="site-cart-link relative inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        href={localizedPath(locale, "cart")}
        aria-current={activeSlug === "cart" ? "page" : undefined}
        aria-label={ready && count > 0 ? `${cartLabel} (${count})` : cartLabel}
        onClick={closeMenus}
      >
        <svg
          aria-hidden="true"
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="20" r="1" fill="currentColor" />
          <circle cx="18" cy="20" r="1" fill="currentColor" />
        </svg>
        {ready && count > 0 && (
          <span className="site-cart-count" aria-hidden="true">
            {count}
          </span>
        )}
      </Link>
      <Button
        type="button"
        className="site-menu-button"
        size="icon"
        variant="secondary"
        aria-controls="primary-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? closeMenuLabel : menuLabel}
        onClick={() => {
          setProfileOpen(false);
          setMenuOpen((open) => !open);
        }}
      >
        <span aria-hidden="true" className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
      </Button>
    </div>
  );
}
