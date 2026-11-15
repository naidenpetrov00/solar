import Image from "next/image";
import type { CSSProperties } from "react";
import { ButtonLink } from "@/components/button";
import { getT } from "@/i18n.server";
import { HomepageArrow } from "./_components/homepage-arrow";
import { HomepageContact } from "./_components/homepage-contact";
import { HomepageDirections } from "./_components/homepage-directions";
import { HomepageProcess } from "./_components/homepage-process";
import { getPageMetadata } from "./_lib/metadata";
import { localizedPath } from "./_lib/routes";

// Temporary image: https://unsplash.com/photos/n2Q4QtRNeUg (Unsplash License).
// Replace the file at this path and adjust the focal points here if needed.
const heroMedia = {
  src: "/images/welcome-solar-hero.jpg",
  desktopFocalPoint: "50% 50%",
  mobileFocalPoint: "58% 50%",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getPageMetadata(locale, "", "home", "pages.home.description");
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });
  const heroStyle = {
    "--hero-position-desktop": heroMedia.desktopFocalPoint,
    "--hero-position-mobile": heroMedia.mobileFocalPoint,
  } as CSSProperties;

  return (
    <main id="main-content" className="welcome-page">
      <section
        className="welcome-hero"
        aria-labelledby="welcome-heading"
        style={heroStyle}
      >
        <Image
          alt=""
          className="welcome-hero-image"
          fill
          preload
          sizes="100vw"
          src={heroMedia.src}
        />

        <div className="welcome-hero-content">
          <div className="welcome-hero-copy">
            <h1 id="welcome-heading" className="welcome-hero-title">
              <span className="welcome-hero-title-text">
                {t("pages.home.hero.headline")}
              </span>
            </h1>
            <p className="welcome-hero-summary">
              {t("pages.home.hero.supporting")}
            </p>
          </div>
          <nav
            aria-label={t("pages.home.hero.pathsLabel")}
            className="welcome-hero-navigation"
          >
            <div className="welcome-primary-paths">
              <ButtonLink
                className="welcome-path welcome-path-home"
                href={localizedPath(locale, "for-home")}
                variant="secondary"
              >
                <span className="welcome-path-content">
                  <span className="welcome-path-label">
                    {t("pages.home.hero.homePath")}
                  </span>
                  <span className="welcome-path-description">
                    {t("pages.home.hero.homePathDescription")}
                  </span>
                </span>
                <HomepageArrow />
              </ButtonLink>
              <ButtonLink
                className="welcome-path welcome-path-business"
                href={localizedPath(locale, "for-business")}
                variant="secondary"
              >
                <span className="welcome-path-content">
                  <span className="welcome-path-label">
                    {t("pages.home.hero.businessPath")}
                  </span>
                  <span className="welcome-path-description">
                    {t("pages.home.hero.businessPathDescription")}
                  </span>
                </span>
                <HomepageArrow />
              </ButtonLink>
            </div>
            <div className="welcome-secondary-paths">
              <ButtonLink
                className="welcome-utility-path"
                href={localizedPath(locale, "maintenance")}
                variant="informational"
              >
                <span>{t("pages.home.hero.maintenancePath")}</span>
                <HomepageArrow />
              </ButtonLink>
              <ButtonLink
                className="welcome-utility-path"
                href={localizedPath(locale, "shop")}
                variant="informational"
              >
                <span>{t("pages.home.hero.shopPath")}</span>
                <HomepageArrow />
              </ButtonLink>
            </div>
          </nav>
        </div>
      </section>

      <HomepageDirections locale={locale} t={t} />
      <HomepageProcess t={t} />
      <HomepageContact locale={locale} t={t} />
    </main>
  );
}
