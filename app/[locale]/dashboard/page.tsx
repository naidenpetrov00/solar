import { getT } from "@/i18n.server";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <main id="main-content" className="dashboard-main">
      <header className="dashboard-introduction">
        <h1>{t("pages.dashboard.title")}</h1>
        <p>{t("pages.dashboard.description")}</p>
      </header>
      <section
        className="dashboard-overview"
        aria-labelledby="dashboard-overview-title"
      >
        <h2 id="dashboard-overview-title">
          {t("pages.dashboard.overview.title")}
        </h2>
        <p>{t("pages.dashboard.overview.description")}</p>
      </section>
    </main>
  );
}
