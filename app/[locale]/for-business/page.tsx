import { getT } from "@/i18n.server";
import { AudienceScenesMotion } from "../_components/audience-scenes-motion";
import { getPageMetadata } from "../_lib/metadata";
import { BusinessDirections } from "./_components/business-directions";
import { BusinessScopeSupport } from "./_components/business-scope-support";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(
    locale,
    "for-business",
    "forBusiness",
    "pages.forBusiness.description",
  );
}

export default async function ForBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <main
      id="main-content"
      className="audience-page business-audience-page"
      data-audience-page
    >
      <AudienceScenesMotion />
      <BusinessDirections locale={locale} t={t} />
      <BusinessScopeSupport locale={locale} t={t} />
    </main>
  );
}
