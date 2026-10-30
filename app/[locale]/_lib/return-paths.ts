import {
  authRouteSlugs,
  dashboardCatalogRouteSlug,
  dashboardPromotionsRouteSlug,
  dashboardRouteSlug,
  dashboardUsersRouteSlug,
  localizedPath,
  routeDefinitions,
  supportedLocales,
} from "./routes";

export function localizedReturnPath(
  sourceLocale: string,
  targetLocale: string,
  value: string,
) {
  const safePath = safeAuthReturnPath(value, sourceLocale);
  const sourcePrefix = sourceLocale === "bg" ? "" : `/${sourceLocale}`;
  const pathWithoutLocale = sourcePrefix
    ? safePath.slice(sourcePrefix.length) || "/"
    : safePath;
  const target = new URL(pathWithoutLocale, "https://internal.invalid");
  const localizedTarget = localizedPath(
    targetLocale,
    target.pathname.replace(/^\/+|\/+$/gu, ""),
  );

  return `${localizedTarget}${target.search}${target.hash}`;
}

export function safeInternalReturnPath(
  value: string | string[] | undefined,
  locale: string,
) {
  const fallback = localizedPath(locale);

  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return fallback;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|7f|2f|5c)/iu.test(value)
  ) {
    return fallback;
  }

  let target: URL;

  try {
    target = new URL(value, "https://internal.invalid");
  } catch {
    return fallback;
  }

  if (target.origin !== "https://internal.invalid") {
    return fallback;
  }

  const localePrefix = locale === "bg" ? "" : `/${locale}`;
  const belongsToLocale = localePrefix
    ? target.pathname === localePrefix ||
      target.pathname.startsWith(`${localePrefix}/`)
    : !supportedLocales.some(
        (supportedLocale) =>
          target.pathname === `/${supportedLocale}` ||
          target.pathname.startsWith(`/${supportedLocale}/`),
      );

  if (!belongsToLocale) {
    return fallback;
  }

  const pathWithoutLocale = localePrefix
    ? target.pathname.slice(localePrefix.length) || "/"
    : target.pathname;
  const slug = pathWithoutLocale.replace(/^\/+|\/+$/gu, "");

  if (
    pathWithoutLocale === "/api" ||
    pathWithoutLocale.startsWith("/api/") ||
    authRouteSlugs.some(
      (authSlug) => slug === authSlug || slug.startsWith(`${authSlug}/`),
    )
  ) {
    return fallback;
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export function safePublicReturnPath(
  value: string | string[] | undefined,
  locale: string,
) {
  const fallback = localizedPath(locale);
  const safePath = safeInternalReturnPath(value, locale);

  if (safePath === fallback) {
    return fallback;
  }

  const localePrefix = locale === "bg" ? "" : `/${locale}`;
  const pathname = safePath.split(/[?#]/u, 1)[0];
  const pathWithoutLocale = localePrefix
    ? pathname.slice(localePrefix.length) || "/"
    : pathname;
  const slug = pathWithoutLocale.replace(/^\/+|\/+$/gu, "");
  const isPublicRoute =
    slug === "" ||
    slug === "cart" ||
    routeDefinitions.some((route) => route.slug === slug) ||
    slug.startsWith("shop/") ||
    slug.startsWith("products/");

  return isPublicRoute ? safePath : fallback;
}

export function safeAuthReturnPath(
  value: string | string[] | undefined,
  locale: string,
) {
  const fallback = localizedPath(locale);
  const safePath = safeInternalReturnPath(value, locale);

  if (safePath === fallback) {
    return fallback;
  }

  const localePrefix = locale === "bg" ? "" : `/${locale}`;
  const pathname = safePath.split(/[?#]/u, 1)[0];
  const pathWithoutLocale = localePrefix
    ? pathname.slice(localePrefix.length) || "/"
    : pathname;
  const slug = pathWithoutLocale.replace(/^\/+|\/+$/gu, "");

  return slug === dashboardRouteSlug ||
    slug === dashboardCatalogRouteSlug ||
    slug === dashboardPromotionsRouteSlug ||
    slug === dashboardUsersRouteSlug
    ? safePath
    : safePublicReturnPath(safePath, locale);
}
