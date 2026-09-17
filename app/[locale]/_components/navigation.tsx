"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { localizedPath } from "../_lib/routes";

type NavigationRoute = {
  slug: string;
  label: string;
};

type NavigationProps = {
  locale: string;
  brandLabel: string;
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
  menuLabel,
  closeMenuLabel,
  navigationLabel,
  languageLabel,
  languageNames,
  routes,
}: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          className="rounded-sm text-lg font-semibold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-950"
          href={localizedPath(locale)}
          aria-current={activeSlug === homeRoute.slug ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          {brandLabel}
        </Link>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 md:hidden"
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
          <ul className="flex items-center gap-2">
            {interiorRoutes.map((route) => (
              <li key={route.slug}>
                <Link
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                  href={localizedPath(locale, route.slug)}
                  aria-current={activeSlug === route.slug ? "page" : undefined}
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div
        id="primary-navigation"
        className={`${menuOpen ? "block" : "hidden"} border-t border-zinc-200 px-6 pb-5 md:hidden`}
      >
        <nav aria-label={navigationLabel}>
          <ul className="flex flex-col gap-1 pt-3">
            {interiorRoutes.map((route) => (
              <li key={route.slug}>
                <Link
                  className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                  href={localizedPath(locale, route.slug)}
                  aria-current={activeSlug === route.slug ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex w-full max-w-6xl justify-end px-6 pb-4">
        <nav aria-label={languageLabel}>
          <ul className="flex gap-2">
            {locales.map((targetLocale) => (
              <li key={targetLocale}>
                <Link
                  className="rounded px-2 py-1 text-xs font-medium uppercase text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                  href={localizedRoute(targetLocale, activeSlug)}
                  aria-current={targetLocale === locale ? "page" : undefined}
                >
                  {languageNames[targetLocale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
