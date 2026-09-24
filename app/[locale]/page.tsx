import Image from "next/image";
import type { CSSProperties } from "react";
import { getT } from "@/i18n.server";
import { HomepageHashSync } from "./_components/homepage-hash-sync";
import { getPageMetadata } from "./_lib/metadata";

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
      <HomepageHashSync />
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
          <h1 id="welcome-heading" className="welcome-hero-title">
            <span className="welcome-hero-title-text">
              {t("pages.home.hero.headline")}
            </span>
          </h1>
        </div>

        <nav
          aria-label={t("pages.home.hero.pathsLabel")}
          className="welcome-paths"
        >
          <a className="welcome-path" href="#residential">
            <span>{t("pages.home.hero.homePath")}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </a>
          <a className="welcome-path" href="#business">
            <span>{t("pages.home.hero.businessPath")}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </a>
        </nav>
      </section>

      <section
        id="residential"
        className="welcome-destination welcome-destination-residential"
        aria-labelledby="residential-heading"
      >
        <h2
          id="residential-heading"
          className="welcome-destination-title welcome-destination-title-from-right"
        >
          {t("pages.home.sections.residentialTitle")}
        </h2>
      </section>

      <section
        id="business"
        className="welcome-destination welcome-destination-business"
        aria-labelledby="business-heading"
      >
        <h2
          id="business-heading"
          className="welcome-destination-title welcome-destination-title-from-left"
        >
          {t("pages.home.sections.businessTitle")}
        </h2>
      </section>
    </main>
  );
}
