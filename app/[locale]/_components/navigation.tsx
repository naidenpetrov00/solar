"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { localizedPath } from "../_lib/routes";

type NavigationRoute = {
  slug: string;
  label: string;
};

type NavigationProps = {
  locale: string;
  brandLabel: string;
  ctaLabel: string;
  menuLabel: string;
  closeMenuLabel: string;
  navigationLabel: string;
  languageLabel: string;
  languageNames: Record<string, string>;
  routes: NavigationRoute[];
};

const locales = ["bg", "en", "tr", "uk"];

export function Navigation({
  locale,
  brandLabel,
  ctaLabel,
  menuLabel,
  closeMenuLabel,
  navigationLabel,
  languageLabel,
  languageNames,
  routes,
}: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });
  const [languageIndicator, setLanguageIndicator] = useState({ left: 0, width: 0 });
  const desktopNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const languageItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const pathname = usePathname();
  const pathWithoutLocale = locales.some(
    (candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  )
    ? pathname.replace(/^\/(bg|en|tr|uk)(?=\/|$)/, "") || "/"
    : pathname;
  const activeSlug = pathWithoutLocale === "/" ? "" : pathWithoutLocale.slice(1);
  const homeRoute = routes[0];
  const interiorRoutes = routes.slice(1);
  const localizedRoute = (targetLocale: string, slug: string) =>
    localizedPath(targetLocale, slug);
  const isActive = (slug: string) => activeSlug === slug;
  const activeNavSlug = interiorRoutes.some((route) => isActive(route.slug))
    ? activeSlug
    : null;

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
    <header className="border-b border-white/10 bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <Link
          className="group flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          href={localizedPath(locale)}
          aria-current={isActive(homeRoute.slug) ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          <svg aria-hidden="true" className="size-8 text-amber-300 transition-transform duration-300 group-hover:rotate-12" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="5" fill="currentColor" />
            <path d="M16 2.5v5M16 24.5v5M29.5 16h-5M7.5 16h-5M25.55 6.45l-3.54 3.54M9.99 22.01l-3.54 3.54M25.55 25.55l-3.54-3.54M9.99 9.99L6.45 6.45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-semibold tracking-[-0.03em] text-white">{brandLabel}</span>
        </Link>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/20 px-3 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? closeMenuLabel : menuLabel}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        </button>

        <nav aria-label={navigationLabel} className="hidden md:block">
          <ul className="relative flex items-center gap-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 z-20 h-0.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.35)] transition-[transform,width] duration-500 ease-out"
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
                  className={`relative z-10 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive(route.slug) ? "text-white" : "text-zinc-400"}`}
                  href={localizedPath(locale, route.slug)}
                  aria-current={isActive(route.slug) ? "page" : undefined}
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <nav aria-label={languageLabel}>
            <ul className="relative flex items-center gap-1 border-r border-white/15 pr-3">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 z-0 h-10 rounded-md bg-white/10 transition-[transform,width] duration-500 ease-out"
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
                    className={`relative z-10 inline-flex min-h-10 items-center rounded px-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${targetLocale === locale ? "text-amber-300" : "text-zinc-500"}`}
                    href={localizedRoute(targetLocale, activeSlug)}
                    aria-current={targetLocale === locale ? "page" : undefined}
                    aria-label={languageNames[targetLocale]}
                  >
                    {targetLocale}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            className="inline-flex min-h-11 items-center rounded-md bg-amber-300 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            href={localizedPath(locale, "contact")}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      <div
        id="primary-navigation"
        className={`${menuOpen ? "block" : "hidden"} border-t border-white/10 px-5 pb-5 sm:px-8 md:hidden`}
      >
        <nav aria-label={navigationLabel}>
          <ul className="flex flex-col gap-1 pt-3">
            {interiorRoutes.map((route) => (
              <li key={route.slug}>
                <Link
                  className={`flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive(route.slug) ? "bg-white/10 text-white" : "text-zinc-400"}`}
                  href={localizedPath(locale, route.slug)}
                  aria-current={isActive(route.slug) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {route.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Link
                className="flex min-h-12 items-center justify-center rounded-md bg-amber-300 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                href={localizedPath(locale, "contact")}
                onClick={() => setMenuOpen(false)}
              >
                {ctaLabel}
              </Link>
            </li>
            <li className="mt-3 border-t border-white/10 pt-4">
              <nav aria-label={languageLabel}>
                <ul className="flex items-center gap-2">
                  {locales.map((targetLocale) => (
                    <li key={targetLocale}>
                      <Link
                        className={`inline-flex min-h-10 items-center rounded px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${targetLocale === locale ? "bg-white/10 text-amber-300" : "text-zinc-500"}`}
                        href={localizedRoute(targetLocale, activeSlug)}
                        aria-current={targetLocale === locale ? "page" : undefined}
                        aria-label={languageNames[targetLocale]}
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
