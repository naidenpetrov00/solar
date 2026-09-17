import { getT } from "@/i18n.server";
import { PageTitle } from "../_components/page-title";
import { getPageMetadata } from "../_lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, "packages", "packages");
}

export default async function PackagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });
  return <PageTitle title={t("pages.packages.title")} />;
}
