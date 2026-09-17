import { getT } from "@/i18n.server";
import { PageTitle } from "../_components/page-title";
import { getPageMetadata } from "../_lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, "about", "about");
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });
  return <PageTitle title={t("pages.about.title")} />;
}
