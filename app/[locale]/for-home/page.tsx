import { getT } from "@/i18n.server";
import { AudienceScenesMotion } from "../_components/audience-scenes-motion";
import { getPageMetadata } from "../_lib/metadata";
import { HomeJourneySupport } from "./_components/home-journey-support";
import { HomeSolutions } from "./_components/home-solutions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(
    locale,
    "for-home",
    "forHome",
    "pages.forHome.description",
  );
}

export default async function ForHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <main
      id="main-content"
      className="audience-page home-audience-page"
      data-audience-page
    >
      <AudienceScenesMotion />
      <HomeSolutions locale={locale} t={t} />
      <HomeJourneySupport locale={locale} t={t} />
    </main>
  );
}
