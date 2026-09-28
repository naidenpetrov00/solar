import Link from "next/link";
import { getT } from "@/i18n.server";
import { getSolarPackagePath, solarPackages } from "../../_lib/solar-packages";
import { getPageMetadata } from "../../_lib/metadata";
import { localizedPath } from "../../_lib/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, "shop/solar-packages", "solarPackages");
}

export default async function SolarPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <main id="main-content" className="solar-packages-page">
      <header className="solar-packages-page-introduction">
        <h1>{t("pages.solarPackages.title")}</h1>
        <p>{t("pages.solarPackages.description")}</p>
      </header>
      <div className="residential-package-grid solar-packages-page-grid">
        {solarPackages.map(({ id, slug }) => (
          <article className="residential-package-card" key={id}>
            <Link
              className="residential-package-card-link"
              href={localizedPath(locale, getSolarPackagePath(slug))}
              scroll
              transitionTypes={["package-detail"]}
            >
              <div aria-hidden="true" className="residential-package-visual" />
              <div className="residential-package-card-content">
                <p className="residential-package-type">
                  {t(`pages.home.residential.packages.${id}.energyType`)}
                </p>
                <h2>{t(`pages.home.residential.packages.${id}.name`)}</h2>
                <p className="residential-package-profile">
                  {t(`pages.home.residential.packages.${id}.profile`)}
                </p>
                <span className="residential-package-card-action">
                  {t("pages.home.residential.viewPackage")}
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
