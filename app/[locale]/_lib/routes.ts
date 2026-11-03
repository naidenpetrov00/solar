export const supportedLocales = ["bg", "en", "tr", "uk"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const openGraphLocaleBySiteLocale: Record<SupportedLocale, string> = {
  bg: "bg_BG",
  en: "en_GB",
  tr: "tr_TR",
  uk: "uk_UA",
};

export function openGraphLocale(locale: string) {
  return openGraphLocaleBySiteLocale[locale as SupportedLocale] ?? "bg_BG";
}

export const dashboardRouteSlug = "dashboard";
export const dashboardCatalogRouteSlug = "dashboard/catalog";
export const dashboardPromotionsRouteSlug = "dashboard/catalog/promotions";
export const dashboardUsersRouteSlug = "dashboard/users";
export const dashboardOrdersRouteSlug = "dashboard/orders";
export const dashboardOrderRecipientsRouteSlug = "dashboard/orders/recipients";
export const accessDeniedRouteSlug = "access-denied";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function dashboardOrderRouteSlug(orderId: string) {
  return `${dashboardOrdersRouteSlug}/${orderId}`;
}

export function isDashboardOrderRouteSlug(slug: string) {
  if (
    slug === dashboardOrdersRouteSlug ||
    slug === dashboardOrderRecipientsRouteSlug
  ) return true;
  const prefix = `${dashboardOrdersRouteSlug}/`;
  return slug.startsWith(prefix) && uuidPattern.test(slug.slice(prefix.length));
}

export const publicUtilityRouteSlugs = [
  "cart",
  "checkout",
  "checkout/confirmation",
  "privacy",
  "terms",
] as const;

export const routeDefinitions = [
  { slug: "", key: "home" },
  { slug: "shop", key: "shop" },
  { slug: "projects", key: "projects" },
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

export function localizedPath(locale: string, slug = "") {
  const path = slug ? `/${slug}` : "/";
  return locale === "bg" ? path : `/${locale}${path}`;
}

export function localizedAlternates(slug = "") {
  return {
    ...Object.fromEntries(
      supportedLocales.map((locale) => [locale, localizedPath(locale, slug)]),
    ),
    "x-default": localizedPath("bg", slug),
  };
}

export function isAuthRouteSlug(slug: string): slug is AuthRouteSlug {
  return authRouteSlugs.some((authSlug) => authSlug === slug);
}

export function isLocaleEquivalentSlug(slug: string) {
  return (
    slug === "" ||
    publicUtilityRouteSlugs.some((utilitySlug) => utilitySlug === slug) ||
    slug === dashboardRouteSlug ||
    slug === dashboardCatalogRouteSlug ||
    slug === dashboardPromotionsRouteSlug ||
    slug === dashboardUsersRouteSlug ||
    isDashboardOrderRouteSlug(slug) ||
    slug === accessDeniedRouteSlug ||
    routeDefinitions.some((route) => route.slug === slug) ||
    authRouteSlugs.some((authSlug) => authSlug === slug)
  );
}
