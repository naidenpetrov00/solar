import Link from "next/link";
import { ThemeSwitchIcon } from "./theme-switch-icon";
import { Button, ButtonLink } from "@/components/button";
import { localizedPath } from "../_lib/routes";
import {
  navigationLocales as locales,
  type NavigationProps,
  type NavigationRoute,
} from "./navigation-model";

type MobileLabels = Pick<
  NavigationProps,
  | "navigationLabel"
  | "signInLabel"
  | "signUpLabel"
  | "themeLabel"
  | "ctaLabel"
  | "languageLabel"
  | "languageNames"
>;

export function NavigationMobileMenu({
  menuOpen,
  navigationLabel,
  interiorRoutes,
  isActive,
  locale,
  activeSlug,
  closeMenus,
  signedIn,
  signInHref,
  signUpHref,
  signInLabel,
  signUpLabel,
  cycleTheme,
  themeLabel,
  currentThemeLabel,
  themeMode,
  ctaLabel,
  languageLabel,
  localizedRoute,
  languageNames,
}: MobileLabels & {
  menuOpen: boolean;
  interiorRoutes: NavigationRoute[];
  isActive: (slug: string) => boolean;
  locale: string;
  activeSlug: string;
  closeMenus: () => void;
  signedIn: boolean;
  signInHref: string;
  signUpHref: string;
  cycleTheme: () => void;
  currentThemeLabel: string;
  themeMode: "light" | "dark";
  localizedRoute: (targetLocale: string) => string;
}) {
  return (
    <div
      id="primary-navigation"
      className="site-mobile-navigation site-divider border-t px-5 pb-5 sm:px-8 xl:hidden"
      hidden={!menuOpen}
    >
      <nav aria-label={navigationLabel}>
        <ul className="flex flex-col gap-1 pt-3">
          {interiorRoutes.map((route) => (
            <li key={route.slug}>
              <Link
                className={`site-nav-link flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${isActive(route.slug) ? "site-active-surface" : ""}`}
                href={localizedPath(locale, route.slug)}
                aria-current={
                  activeSlug === route.slug
                    ? "page"
                    : isActive(route.slug)
                      ? "location"
                      : undefined
                }
                onClick={closeMenus}
              >
                {route.label}
              </Link>
            </li>
          ))}
          {!signedIn ? (
            <li className="grid grid-cols-2 gap-2 pt-3">
              <ButtonLink
                className="site-mobile-auth-action"
                variant="informational"
                href={signInHref}
                onClick={closeMenus}
              >
                {signInLabel}
              </ButtonLink>
              <ButtonLink
                className="site-mobile-auth-action site-mobile-auth-action-outlined"
                variant="secondary"
                href={signUpHref}
                onClick={closeMenus}
              >
                {signUpLabel}
              </ButtonLink>
            </li>
          ) : null}
          <li className="pt-3">
            <Button
              type="button"
              className="site-theme-button"
              fullWidth
              variant="secondary"
              onClick={cycleTheme}
              aria-label={`${themeLabel}: ${currentThemeLabel}`}
              data-theme-mode={themeMode}
            >
              <ThemeSwitchIcon />
              {currentThemeLabel}
            </Button>
          </li>
          <li className="pt-3">
            <ButtonLink
              className="site-cta"
              fullWidth
              href={localizedPath(locale, "contact")}
              onClick={closeMenus}
            >
              {ctaLabel}
            </ButtonLink>
          </li>
          <li className="site-divider mt-3 border-t pt-4">
            <nav aria-label={languageLabel}>
              <ul className="flex items-center gap-2">
                {locales.map((targetLocale) => (
                  <li key={targetLocale}>
                    <Link
                      className={`site-language inline-flex min-h-10 items-center rounded px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${targetLocale === locale ? "site-active-surface" : ""}`}
                      data-active={targetLocale === locale}
                      href={localizedRoute(targetLocale)}
                      aria-current={
                        targetLocale === locale ? "page" : undefined
                      }
                      aria-label={languageNames[targetLocale]}
                      onClick={closeMenus}
                    >
                      {targetLocale}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </li>
        </ul>
      </nav>
    </div>
  );
}
