import { findSolarPackage } from "./solar-packages";

export const supportedLocales = ["bg", "en", "tr", "uk"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const dashboardRouteSlug = "dashboard";
export const dashboardUsersRouteSlug = "dashboard/users";
export const accessDeniedRouteSlug = "access-denied";

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
export type SocialProviderSlug = "google" | "facebook";

const oauthCallbackErrorCodes = new Set([
  "account_already_linked_to_different_user",
  "account_not_linked",
  "email_does_not_match",
  "email_not_found",
  "email_not_verified",
  "invalid_code",
  "issuer_mismatch",
  "issuer_missing",
  "no_callback_url",
  "no_code",
  "nonce_binding_missing",
  "oauth_provider_not_found",
  "signup_disabled",
  "unable_to_create_session",
  "unable_to_create_user",
  "unable_to_get_user_info",
  "unable_to_link_account",
  "unable_to_update_account",
]);

const authQueryParameters: Record<AuthRouteSlug, readonly string[]> = {
  "sign-in": ["returnTo"],
  "sign-up": ["returnTo"],
  "forgot-password": ["returnTo"],
  "reset-password": ["token", "error", "returnTo"],
  "verify-email": ["status", "error", "returnTo"],
};

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

export function localizedSocialErrorPath(
  locale: string,
  slug: Extract<AuthRouteSlug, "sign-in" | "sign-up">,
  returnTo: string,
  provider: SocialProviderSlug,
) {
  const query = new URLSearchParams({
    returnTo: safeAuthReturnPath(returnTo, locale),
    provider,
  });
  return `${localizedPath(locale, slug)}?${query.toString()}`;
}

export function isAuthRouteSlug(slug: string): slug is AuthRouteSlug {
  return authRouteSlugs.some((authSlug) => authSlug === slug);
}

export function localizedAuthLanguagePath(
  sourceLocale: string,
  targetLocale: string,
  slug: AuthRouteSlug,
  searchParams: Pick<URLSearchParams, "get">,
) {
  const query = new URLSearchParams();

  for (const parameter of authQueryParameters[slug]) {
    const value = searchParams.get(parameter);

    if (value === null) {
      continue;
    }

    query.set(
      parameter,
      parameter === "returnTo"
        ? localizedReturnPath(sourceLocale, targetLocale, value)
        : value,
    );
  }

  if (slug === "sign-in" || slug === "sign-up") {
    const provider = searchParams.get("provider");
    const error = searchParams.get("error");

    if (isSocialProviderSlug(provider) && isOAuthCallbackErrorCode(error)) {
      query.set("provider", provider);
      query.set("error", error);
    }
  }

  const path = localizedPath(targetLocale, slug);
  return query.size === 0 ? path : `${path}?${query.toString()}`;
}

function isSocialProviderSlug(value: string | null): value is SocialProviderSlug {
  return value === "google" || value === "facebook";
}

function isOAuthCallbackErrorCode(value: string | null): value is string {
  return value !== null && oauthCallbackErrorCodes.has(value);
}

export function localizedVerificationCallbackPath(
  locale: string,
  returnTo: string | string[] | undefined,
) {
  const query = new URLSearchParams({
    status: "success",
    returnTo: safeAuthReturnPath(returnTo, locale),
  });

  return `${localizedPath(locale, "verify-email")}?${query.toString()}`;
}

export function localizedPasswordResetCallbackPath(
  locale: string,
  returnTo: string | string[] | undefined,
) {
  const query = new URLSearchParams({
    returnTo: safeAuthReturnPath(returnTo, locale),
  });

  return `${localizedPath(locale, "reset-password")}?${query.toString()}`;
}

export function isLocaleEquivalentSlug(slug: string) {
  return (
    slug === "" ||
    slug === "cart" ||
    slug === dashboardRouteSlug ||
    slug === dashboardUsersRouteSlug ||
    slug === accessDeniedRouteSlug ||
    routeDefinitions.some((route) => route.slug === slug) ||
    authRouteSlugs.some((authSlug) => authSlug === slug)
  );
}

function localizedReturnPath(
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
  const isKnownPackageDetail =
    slug.startsWith("shop/solar-packages/") &&
    slug.split("/").length === 3 &&
    Boolean(findSolarPackage(slug.split("/")[2]));
  const isPublicRoute =
    slug === "" ||
    slug === "cart" ||
    routeDefinitions.some((route) => route.slug === slug) ||
    slug === "shop/solar-packages" ||
    isKnownPackageDetail;

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

  return slug === dashboardRouteSlug || slug === dashboardUsersRouteSlug
    ? safePath
    : safePublicReturnPath(safePath, locale);
}
