import type { Metadata } from "next";
import { getT } from "@/i18n.server";
import { localizedAlternates, localizedPath, openGraphLocale } from "./routes";

export async function policyMetadata(locale: string, namespace: "privacy" | "terms", slug: string): Promise<Metadata> {
  const { t } = await getT(namespace, { lng: locale });
  return {
    title: t("page.title"),
    description: t("page.description"),
    alternates: { canonical: localizedPath(locale, slug), languages: localizedAlternates(slug) },
    openGraph: { title: t("page.title"), description: t("page.description"), locale: openGraphLocale(locale), type: "website" },
  };
}
