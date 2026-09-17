export const supportedLocales = ["bg", "en", "tr", "uk"] as const;

export const routeDefinitions = [
  { slug: "", key: "home" },
  { slug: "solutions", key: "solutions" },
  { slug: "projects", key: "projects" },
  { slug: "packages", key: "packages" },
  { slug: "about", key: "about" },
  { slug: "contact", key: "contact" },
] as const;

export function localizedPath(locale: string, slug = "") {
  const path = slug ? `/${slug}` : "/";
  return locale === "bg" ? path : `/${locale}${path}`;
}

export function localizedAlternates(slug = "") {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, localizedPath(locale, slug)]),
  );
}
