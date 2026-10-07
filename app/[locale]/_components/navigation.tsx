"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  isAuthRouteSlug,
  isLocaleEquivalentSlug,
  localizedAuthLanguagePath,
  localizedAuthPath,
  localizedPath,
  safePublicReturnPath,
} from "../_lib/routes";
import { findSolarPackage } from "../_lib/solar-packages";
import { useCart } from "./cart-store";

type NavigationRoute = {
  slug: string;
  label: string;
};

type NavigationUser = {
  name: string;
  email: string;
};

type NavigationProps = {
  locale: string;
  brandLabel: string;
  ctaLabel: string;
  cartLabel: string;
  menuLabel: string;
  closeMenuLabel: string;
  navigationLabel: string;
  languageLabel: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  user?: NavigationUser;
  signInLabel: string;
  signUpLabel: string;
  accountLabel: string;
  signOutLabel: string;
  signingOutLabel: string;
  signOutError: string;
  accountMenuLabel: string;
  openAccountMenuLabel: string;
  closeAccountMenuLabel: string;
  initialTheme?: "light" | "dark";
  languageNames: Record<string, string>;
  routes: NavigationRoute[];
};

const locales = ["bg", "en", "tr", "uk"];

export function Navigation({
  locale,
  brandLabel,
  ctaLabel,
  cartLabel,
  menuLabel,
  closeMenuLabel,
  navigationLabel,
  languageLabel,
  themeLabel,
  themeLight,
  themeDark,
  user,
  signInLabel,
  signUpLabel,
  accountLabel,
  signOutLabel,
  signingOutLabel,
  signOutError,
  accountMenuLabel,
  openAccountMenuLabel,
  closeAccountMenuLabel,
  initialTheme,
  languageNames,
  routes,
}: NavigationProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });
  const [languageIndicator, setLanguageIndicator] = useState({ left: 0, width: 0 });
  const [themeMode, setThemeMode] = useState<"light" | "dark">(initialTheme ?? "light");
  const desktopNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const languageItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profilePanelRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { count, ready } = useCart();
  const pathWithoutLocale = locales.some(
    (candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  )
    ? pathname.replace(/^\/(bg|en|tr|uk)(?=\/|$)/, "") || "/"
    : pathname;
  const activeSlug = pathWithoutLocale === "/" ? "" : pathWithoutLocale.slice(1);
  const isHomePage = activeSlug === "";
  const homeRoute = routes[0];
  const interiorRoutes = routes.slice(1);
  const currentSearch = searchParams.toString();
  const currentPath = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
  const returnTo = safePublicReturnPath(currentPath, locale);
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);
  const signUpHref = localizedAuthPath(locale, "sign-up", returnTo);
  const equivalentSlug = isLocaleEquivalentSlug(activeSlug) ||
    activeSlug === "shop/solar-packages" ||
    (activeSlug.startsWith("shop/solar-packages/") && findSolarPackage(activeSlug.split("/")[2]))
    ? activeSlug
    : "";
  const localizedRoute = (targetLocale: string) =>
    isAuthRouteSlug(equivalentSlug)
      ? localizedAuthLanguagePath(
          locale,
          targetLocale,
          equivalentSlug,
          searchParams,
        )
      : localizedPath(targetLocale, equivalentSlug);
  const isActive = (slug: string) => activeSlug === slug || (slug === "shop" && activeSlug.startsWith("shop/"));
  const activeNavSlug = interiorRoutes.find((route) => isActive(route.slug))?.slug ?? null;

  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname, currentSearch]);

  const toggleProfile = (trigger: HTMLButtonElement) => {
    profileTriggerRef.current = trigger;
    setLogoutError(null);
    setMenuOpen(false);
    setProfileOpen((open) => !open);
  };

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("solar-theme");
    } catch {
      // Use the device preference when storage is unavailable.
    }

      if (savedTheme === "light" || savedTheme === "dark") {
        document.documentElement.dataset.theme = savedTheme;
        document.cookie = `solar-theme=${savedTheme}; Max-Age=31536000; Path=/; SameSite=Lax`;
        setThemeMode(savedTheme);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateFromSystem = () => setThemeMode(mediaQuery.matches ? "dark" : "light");
    updateFromSystem();
    mediaQuery.addEventListener("change", updateFromSystem);

    return () => mediaQuery.removeEventListener("change", updateFromSystem);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;

    const closeFromOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !profilePanelRef.current?.contains(target) &&
        !profileTriggerRef.current?.contains(target)
      ) {
        setProfileOpen(false);
      }
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      profileTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeFromOutsidePointer);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutsidePointer);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [profileOpen]);

  const cycleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem("solar-theme", nextTheme);
      document.cookie = `solar-theme=${nextTheme}; Max-Age=31536000; Path=/; SameSite=Lax`;
  };

  const handleSignOut = async () => {
    setLogoutPending(true);
    setLogoutError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setLogoutError(signOutError);
        return;
      }

      closeMenus();
      router.replace(safePublicReturnPath(currentPath, locale));
      router.refresh();
    } catch {
      setLogoutError(signOutError);
    } finally {
      setLogoutPending(false);
    }
  };

  const currentThemeLabel = themeMode === "light" ? themeLight : themeDark;

  useLayoutEffect(() => {
    const activeLink = activeNavSlug
      ? desktopNavItemRefs.current[activeNavSlug]
      : null;

    if (!activeLink) {
      setActiveIndicator((indicator) => ({ ...indicator, width: 0 }));
      return;
    }

    const updateIndicator = () => {
      setActiveIndicator({
        left: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(activeLink);

    return () => observer.disconnect();
  }, [activeNavSlug, pathname]);

  useLayoutEffect(() => {
    const activeLink = languageItemRefs.current[locale];

    if (!activeLink) return;

    const updateIndicator = () => {
      setLanguageIndicator({
        left: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(activeLink);

    return () => observer.disconnect();
  }, [locale]);

  return (
    <header
      className={`site-header border-b ${isHomePage ? "site-header-overlay" : ""}`}
      data-overlay={isHomePage ? "true" : undefined}
    >
      <div className="relative mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <Link
          className="site-brand group flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          href={localizedPath(locale)}
          aria-current={isActive(homeRoute.slug) ? "page" : undefined}
          onClick={closeMenus}
        >
          <svg aria-hidden="true" className="site-accent size-8 transition-transform duration-300 group-hover:rotate-12" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="5" fill="currentColor" />
            <path d="M16 2.5v5M16 24.5v5M29.5 16h-5M7.5 16h-5M25.55 6.45l-3.54 3.54M9.99 22.01l-3.54 3.54M25.55 25.55l-3.54-3.54M9.99 9.99L6.45 6.45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-semibold tracking-[-0.03em]">{brandLabel}</span>
        </Link>

        <div className="flex items-center gap-2 xl:hidden">
          {user ? (
            <button
              type="button"
              className="site-account-trigger inline-flex size-11 items-center justify-center rounded-md border focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-controls="account-menu"
              aria-expanded={profileOpen}
              aria-label={profileOpen ? closeAccountMenuLabel : openAccountMenuLabel}
              onClick={(event) => toggleProfile(event.currentTarget)}
            >
              <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5 20c.9-3.2 3.3-5 7-5s6.1 1.8 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <Link
            className="site-cart-link relative inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            href={localizedPath(locale, "cart")}
            aria-current={activeSlug === "cart" ? "page" : undefined}
            aria-label={ready && count > 0 ? `${cartLabel} (${count})` : cartLabel}
            onClick={closeMenus}
          >
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {ready && count > 0 && <span className="site-cart-count" aria-hidden="true">{count}</span>}
          </Link>
          <button
            type="button"
            className="site-menu-button inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
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
          </button>
        </div>

        <nav aria-label={navigationLabel} className="hidden xl:block">
          <ul className="relative flex items-center gap-1">
            <span
              aria-hidden="true"
              className="site-accent pointer-events-none absolute bottom-0 left-0 z-20 h-0.5 rounded-full bg-current shadow-[0_0_12px_rgba(252,211,77,0.35)] transition-[transform,width] duration-500 ease-out"
              style={{
                width: activeIndicator.width,
                transform: `translateX(${activeIndicator.left}px)`,
              }}
            />
            {interiorRoutes.map((route) => (
              <li key={route.slug}>
                <Link
                  ref={(element) => {
                    desktopNavItemRefs.current[route.slug] = element;
                  }}
                  className="site-nav-link relative z-10 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  data-active={isActive(route.slug)}
                  href={localizedPath(locale, route.slug)}
                  aria-current={activeSlug === route.slug ? "page" : isActive(route.slug) ? "location" : undefined}
                  onClick={closeMenus}
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <nav aria-label={languageLabel}>
            <ul className="site-divider relative flex items-center gap-1 border-r pr-3">
              <span
                aria-hidden="true"
                className="site-active-surface pointer-events-none absolute left-0 top-0 z-0 h-10 rounded-md transition-[transform,width] duration-500 ease-out"
                style={{
                  width: languageIndicator.width,
                  transform: `translateX(${languageIndicator.left}px)`,
                }}
              />
              {locales.map((targetLocale) => (
                <li key={targetLocale}>
                  <Link
                    ref={(element) => {
                      languageItemRefs.current[targetLocale] = element;
                    }}
                    className="site-language relative z-10 inline-flex min-h-10 items-center rounded px-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                    data-active={targetLocale === locale}
                    href={localizedRoute(targetLocale)}
                    aria-current={targetLocale === locale ? "page" : undefined}
                    aria-label={languageNames[targetLocale]}
                    onClick={closeMenus}
                  >
                    {targetLocale}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="site-theme-button inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={cycleTheme}
            aria-label={`${themeLabel}: ${currentThemeLabel}`}
            title={`${themeLabel}: ${currentThemeLabel}`}
            data-theme-mode={themeMode}
          >
            <span aria-hidden="true" className="theme-switch">
              <span className="theme-switch-thumb">
                <span className="theme-icon theme-sun"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor" /><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.9 11.9l1.05 1.05M12.95 3.05 11.9 4.1M4.1 11.9l-1.05 1.05" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg></span>
                <span className="theme-icon theme-moon"><svg viewBox="0 0 16 16" fill="none"><path d="M13 10.4A5.4 5.4 0 0 1 5.6 3a5.4 5.4 0 1 0 7.4 7.4Z" fill="currentColor" /></svg></span>
              </span>
            </span>
            <span className="sr-only">{currentThemeLabel}</span>
          </button>
          <Link
            className="site-cart-link relative inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            href={localizedPath(locale, "cart")}
            aria-current={activeSlug === "cart" ? "page" : undefined}
            aria-label={ready && count > 0 ? `${cartLabel} (${count})` : cartLabel}
            onClick={closeMenus}
          >
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {ready && count > 0 && <span className="site-cart-count" aria-hidden="true">{count}</span>}
          </Link>
          {user ? (
            <button
              type="button"
              className="site-account-trigger inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-controls="account-menu"
              aria-expanded={profileOpen}
              aria-label={profileOpen ? closeAccountMenuLabel : openAccountMenuLabel}
              onClick={(event) => toggleProfile(event.currentTarget)}
            >
              <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5 20c.9-3.2 3.3-5 7-5s6.1 1.8 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>{accountLabel}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link className="site-auth-link inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2" href={signInHref}>
                {signInLabel}
              </Link>
              <Link className="site-auth-link site-auth-link-outlined inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2" href={signUpHref}>
                {signUpLabel}
              </Link>
            </div>
          )}
          <Link
            className="site-cta inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            href={localizedPath(locale, "contact")}
            onClick={closeMenus}
          >
            {ctaLabel}
          </Link>
        </div>
        {user && profileOpen ? (
          <div
            ref={profilePanelRef}
            id="account-menu"
            className="site-account-panel absolute right-5 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2.5rem))] border p-4 sm:right-8 xl:right-8"
            role="group"
            aria-label={accountMenuLabel}
          >
            <div className="border-b pb-4">
              <p className="m-0 break-words text-sm font-semibold tracking-[-0.015em]">{user.name}</p>
              <p className="site-account-email m-0 mt-1 break-all text-sm">{user.email}</p>
            </div>
            {logoutError ? <p className="site-account-error" role="alert">{logoutError}</p> : null}
            <button
              type="button"
              className="site-account-logout mt-4 inline-flex min-h-11 w-full items-center justify-center border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={handleSignOut}
              disabled={logoutPending}
            >
              {logoutPending ? signingOutLabel : signOutLabel}
            </button>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {logoutPending ? signingOutLabel : ""}
            </p>
          </div>
        ) : null}
      </div>

      <div
        id="primary-navigation"
        className={`${menuOpen ? "block" : "hidden"} site-mobile-navigation site-divider border-t px-5 pb-5 sm:px-8 xl:hidden`}
      >
        <nav aria-label={navigationLabel}>
          <ul className="flex flex-col gap-1 pt-3">
            {interiorRoutes.map((route) => (
              <li key={route.slug}>
                <Link
                  className={`site-nav-link flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${isActive(route.slug) ? "site-active-surface" : ""}`}
                  href={localizedPath(locale, route.slug)}
                  aria-current={activeSlug === route.slug ? "page" : isActive(route.slug) ? "location" : undefined}
                  onClick={closeMenus}
                >
                  {route.label}
                </Link>
              </li>
            ))}
            {!user ? (
              <li className="grid grid-cols-2 gap-2 pt-3">
                <Link
                  className="site-mobile-auth-action flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                  href={signInHref}
                  onClick={closeMenus}
                >
                  {signInLabel}
                </Link>
                <Link
                  className="site-mobile-auth-action site-mobile-auth-action-outlined flex min-h-11 items-center justify-center rounded-md border px-3 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                  href={signUpHref}
                  onClick={closeMenus}
                >
                  {signUpLabel}
                </Link>
              </li>
            ) : null}
            <li className="pt-3">
              <button
                type="button"
                className="site-theme-button flex min-h-11 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={cycleTheme}
                aria-label={`${themeLabel}: ${currentThemeLabel}`}
                data-theme-mode={themeMode}
              >
                <span aria-hidden="true" className="theme-switch">
                  <span className="theme-switch-thumb">
                    <span className="theme-icon theme-sun"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor" /><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.9 11.9l1.05 1.05M12.95 3.05 11.9 4.1M4.1 11.9l-1.05 1.05" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg></span>
                    <span className="theme-icon theme-moon"><svg viewBox="0 0 16 16" fill="none"><path d="M13 10.4A5.4 5.4 0 0 1 5.6 3a5.4 5.4 0 1 0 7.4 7.4Z" fill="currentColor" /></svg></span>
                  </span>
                </span>
                {currentThemeLabel}
              </button>
            </li>
            <li className="pt-3">
              <Link
                className="site-cta flex min-h-12 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                href={localizedPath(locale, "contact")}
                onClick={closeMenus}
              >
                {ctaLabel}
              </Link>
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
                        aria-current={targetLocale === locale ? "page" : undefined}
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

    </header>
  );
}
