import Image from "next/image";
import { ButtonLink } from "@/components/button";
import { audienceContactPath } from "../../_lib/audience-contact-path";

type Translate = (key: string) => string;

const autonomyParts = ["production", "storage", "management"] as const;

// Temporary generated imagery. Replace with verified company photography.
const homeMedia = {
  residence: "/images/home-temporary-illustration.webp",
  autonomy: "/images/home-autonomy-temporary.webp",
} as const;

export function HomeSolutions({
  locale,
  t,
}: {
  locale: string;
  t: Translate;
}) {
  const installationHref = audienceContactPath(locale, {
    audience: "home",
    service: "installation",
  });
  const autonomyHref = audienceContactPath(locale, {
    audience: "home",
    service: "autonomous-home",
  });

  return (
    <>
      <section className="home-audience-hero" aria-labelledby="home-heading">
        <div className="home-audience-hero-copy">
          <h1 id="home-heading">{t("pages.forHome.hero.headline")}</h1>
          <p>{t("pages.forHome.hero.introduction")}</p>
          <div className="audience-actions">
            <ButtonLink href={autonomyHref} variant="primary">
              {t("pages.forHome.hero.autonomyCta")}
            </ButtonLink>
            <ButtonLink href={installationHref} variant="secondary">
              {t("pages.forHome.hero.selfConsumptionCta")}
            </ButtonLink>
          </div>
        </div>
        <div className="home-audience-hero-media">
          <Image
            alt=""
            className="audience-cover-image"
            fill
            preload
            quality={90}
            sizes="(min-width: 64rem) 58vw, 100vw"
            src={homeMedia.residence}
          />
        </div>
      </section>

      <section
        className="home-autonomy audience-scene"
        data-audience-scene
        id="home-autonomy"
        aria-labelledby="home-autonomy-heading"
      >
        <div className="home-autonomy-media audience-scene-media">
          <Image
            alt={t("pages.forHome.autonomy.imageAlt")}
            className="audience-cover-image"
            fill
            quality={90}
            sizes="(min-width: 64rem) 50vw, 100vw"
            src={homeMedia.autonomy}
          />
        </div>
        <div className="home-autonomy-copy audience-scene-copy">
          <h2 id="home-autonomy-heading">
            {t("pages.forHome.autonomy.title")}
          </h2>
          <p className="home-autonomy-introduction">
            {t("pages.forHome.autonomy.description")}
          </p>
          <ul className="home-autonomy-parts">
            {autonomyParts.map((part) => (
              <li key={part}>
                <h3>{t(`pages.forHome.autonomy.parts.${part}.title`)}</h3>
                <p>{t(`pages.forHome.autonomy.parts.${part}.description`)}</p>
              </li>
            ))}
          </ul>
          <p className="home-autonomy-assessment">
            {t("pages.forHome.autonomy.assessment")}
          </p>
          <ButtonLink href={autonomyHref} variant="primary">
            {t("pages.forHome.autonomy.cta")}
          </ButtonLink>
          <p className="home-water-note">
            {t("pages.forHome.autonomy.waterNote")}
          </p>
        </div>
      </section>

      <section
        className="home-self-consumption audience-scene"
        data-audience-scene
        aria-labelledby="home-self-consumption-heading"
      >
        <h2 id="home-self-consumption-heading">
          {t("pages.forHome.selfConsumption.title")}
        </h2>
        <div className="home-self-consumption-copy">
          <p>{t("pages.forHome.selfConsumption.description")}</p>
          <p>{t("pages.forHome.selfConsumption.assessment")}</p>
          <ButtonLink href={installationHref} variant="primary">
            {t("pages.forHome.selfConsumption.cta")}
          </ButtonLink>
        </div>
      </section>

      <section
        className="home-equipment audience-scene"
        data-audience-scene
        aria-labelledby="home-equipment-heading"
      >
        <div>
          <h2 id="home-equipment-heading">
            {t("pages.forHome.equipment.title")}
          </h2>
          <p>{t("pages.forHome.equipment.introduction")}</p>
        </div>
        <div className="home-equipment-options">
          <article>
            <h3>{t("pages.forHome.equipment.supplied.title")}</h3>
            <p>{t("pages.forHome.equipment.supplied.description")}</p>
          </article>
          <article>
            <h3>{t("pages.forHome.equipment.customerOwned.title")}</h3>
            <p>{t("pages.forHome.equipment.customerOwned.description")}</p>
          </article>
        </div>
      </section>
    </>
  );
}
