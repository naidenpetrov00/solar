import Link from "next/link";
import { ThemeSwitchIcon } from "./theme-switch-icon";
import type { RefObject } from "react";
import { Button, ButtonLink } from "@/components/button";
import { localizedPath } from "../_lib/routes";
import type { NavigationProps } from "./navigation-model";
import { NavigationDesktopLanguageSelector } from "./navigation-desktop-language-selector";
import { NavigationDesktopAccount } from "./navigation-desktop-account";

type DesktopLabels = Pick<
  NavigationProps,
  | "languageLabel"
  | "languageNames"
  | "themeLabel"
  | "cartLabel"
  | "openAccountMenuLabel"
  | "closeAccountMenuLabel"
  | "accountLabel"
  | "signInLabel"
  | "signUpLabel"
  | "ctaLabel"
  | "user"
>;

export function NavigationDesktopControls({
  languageLabel,
  languageIndicator,
  languageItemRefs,
  locale,
  localizedRoute,
  languageNames,
  closeMenus,
  themeLabel,
  currentThemeLabel,
  themeMode,
  cycleTheme,
  cartLabel,
  ready,
  count,
  activeSlug,
  user,
  profileOpen,
  openAccountMenuLabel,
  closeAccountMenuLabel,
  toggleProfile,
  accountLabel,
  signInHref,
  signUpHref,
  signInLabel,
  signUpLabel,
  ctaLabel,
}: DesktopLabels & {
  languageIndicator: { left: number; width: number };
  languageItemRefs: RefObject<Record<string, HTMLAnchorElement | null>>;
  locale: string;
  localizedRoute: (targetLocale: string) => string;
  closeMenus: () => void;
  currentThemeLabel: string;
  themeMode: "light" | "dark";
  cycleTheme: () => void;
  ready: boolean;
  count: number;
  activeSlug: string;
  profileOpen: boolean;
  toggleProfile: (trigger: HTMLButtonElement) => void;
  signInHref: string;
  signUpHref: string;
}) {
  return (
    <div className="hidden items-center gap-3 xl:flex">
      <NavigationDesktopLanguageSelector
        languageLabel={languageLabel}
        languageIndicator={languageIndicator}
        languageItemRefs={languageItemRefs}
        locale={locale}
        localizedRoute={localizedRoute}
        languageNames={languageNames}
        closeMenus={closeMenus}
      />
      <Button
        type="button"
        className="site-theme-button"
        variant="secondary"
        onClick={cycleTheme}
        aria-label={`${themeLabel}: ${currentThemeLabel}`}
        title={`${themeLabel}: ${currentThemeLabel}`}
        data-theme-mode={themeMode}
      >
        <ThemeSwitchIcon />
        <span className="sr-only">{currentThemeLabel}</span>
      </Button>
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
      <NavigationDesktopAccount
        user={user}
        profileOpen={profileOpen}
        closeAccountMenuLabel={closeAccountMenuLabel}
        openAccountMenuLabel={openAccountMenuLabel}
        toggleProfile={toggleProfile}
        accountLabel={accountLabel}
        signInHref={signInHref}
        signUpHref={signUpHref}
        signInLabel={signInLabel}
        signUpLabel={signUpLabel}
      />
      <ButtonLink
        className="site-cta"
        href={localizedPath(locale, "contact")}
        onClick={closeMenus}
      >
        {ctaLabel}
      </ButtonLink>
    </div>
  );
}
