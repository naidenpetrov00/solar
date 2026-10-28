import { usePathname, useSearchParams } from "next/navigation";
import {
  isAuthRouteSlug,
  isLocaleEquivalentSlug,
  localizedPath,
} from "../_lib/routes";
import {
  localizedAuthLanguagePath,
  localizedAuthPath,
} from "../_lib/auth-routes";
import { safePublicReturnPath } from "../_lib/return-paths";
import {
  navigationLocales as locales,
  type NavigationRoute,
} from "./navigation-model";

export function useNavigationRoutes(locale: string, routes: NavigationRoute[]) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathWithoutLocale = locales.some(
    (candidate) =>
      pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  )
    ? pathname.replace(/^\/(bg|en|tr|uk)(?=\/|$)/, "") || "/"
    : pathname;
  const activeSlug =
    pathWithoutLocale === "/" ? "" : pathWithoutLocale.slice(1);
  const isHomePage = activeSlug === "";
  const homeRoute = routes[0];
  const interiorRoutes = routes.slice(1);
  const currentSearch = searchParams.toString();
  const currentPath = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
  const returnTo = safePublicReturnPath(currentPath, locale);
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);
  const signUpHref = localizedAuthPath(locale, "sign-up", returnTo);
  const equivalentSlug = isLocaleEquivalentSlug(activeSlug) ? activeSlug : "";
  const isCatalogEntity =
    activeSlug === "shop" ||
    activeSlug.startsWith("shop/") ||
    activeSlug.startsWith("products/");
  const localizedRoute = (targetLocale: string) =>
    isCatalogEntity
      ? `/api/catalog/locale-route?${new URLSearchParams({
          target: targetLocale,
          path: pathname,
          ...(currentSearch ? { search: currentSearch } : {}),
        }).toString()}`
      : isAuthRouteSlug(equivalentSlug)
        ? localizedAuthLanguagePath(
            locale,
            targetLocale,
            equivalentSlug,
            searchParams,
          )
        : localizedPath(targetLocale, equivalentSlug);
  const isActive = (slug: string) =>
    activeSlug === slug ||
    (slug === "shop" &&
      (activeSlug.startsWith("shop/") || activeSlug.startsWith("products/")));
  const activeNavSlug =
    interiorRoutes.find((route) => isActive(route.slug))?.slug ?? null;
  return {
    pathname,
    currentSearch,
    currentPath,
    activeSlug,
    isHomePage,
    homeRoute,
    interiorRoutes,
    signInHref,
    signUpHref,
    localizedRoute,
    isActive,
    activeNavSlug,
  };
}
