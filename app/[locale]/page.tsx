import { getT } from "@/i18n.server";
import { getPageMetadata } from "./_lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, "", "home");
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <main
      id="main-content"
      className="site-page flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-16"
    >
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {t("pages.home.title")}
      </h1>
    </main>
  );
}
