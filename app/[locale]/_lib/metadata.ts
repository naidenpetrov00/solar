import type { Metadata } from "next";
import { getT } from "@/i18n.server";
import { localizedAlternates, localizedPath } from "./routes";

export async function getPageMetadata(
  locale: string,
  slug: string,
  pageKey: string,
  descriptionKey = "metadata.description",
): Promise<Metadata> {
  const { t } = await getT("common", { lng: locale });
  const title = t(`pages.${pageKey}.title`);
  const description = t(descriptionKey);

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, slug),
      languages: localizedAlternates(slug),
    },
    openGraph: {
      title,
      description,
      locale,
      type: "website",
    },
  };
}
