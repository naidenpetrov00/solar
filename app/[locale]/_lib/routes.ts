export const supportedLocales = ["bg", "en", "tr", "uk"] as const;

export const routeDefinitions = [
  { slug: "", key: "home" },
  { slug: "shop", key: "shop" },
  { slug: "projects", key: "projects" },
  { slug: "packages", key: "packages" },
  { slug: "contact", key: "contact" },
] as const;

export const authRouteSlugs = [
  "sign-up",
  "sign-in",
  "forgot-password",
  "reset-password",
  "verify-email",
] as const;

export type AuthRouteSlug = (typeof authRouteSlugs)[number];

export function localizedPath(locale: string, slug = "") {
  const path = slug ? `/${slug}` : "/";
  return locale === "bg" ? path : `/${locale}${path}`;
}

export function localizedAlternates(slug = "") {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, localizedPath(locale, slug)]),
  );
}

export function localizedAuthPath(
  locale: string,
  slug: AuthRouteSlug,
  returnTo?: string,
) {
  const path = localizedPath(locale, slug);

  if (!returnTo) {
    return path;
  }

  const query = new URLSearchParams({ returnTo });
  return `${path}?${query.toString()}`;
}

export function isLocaleEquivalentSlug(slug: string) {
  return (
    slug === "" ||
    slug === "cart" ||
    routeDefinitions.some((route) => route.slug === slug) ||
    authRouteSlugs.some((authSlug) => authSlug === slug)
  );
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
    ? target.pathname === localePrefix || target.pathname.startsWith(`${localePrefix}/`)
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
