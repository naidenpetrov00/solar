import Image from "next/image";
import { ButtonLink } from "@/components/button";
import { AudienceArrow } from "../../_components/audience-arrow";
import { audienceContactPath } from "../../_lib/audience-contact-path";
import { localizedPath } from "../../_lib/routes";

type Translate = (key: string) => string;

const journeySteps = [
  "consultation",
  "solution",
  "deliveryInstallation",
  "documentationMaintenance",
] as const;
const maintenanceItems = ["cleaning", "inspection", "technical"] as const;

// Temporary generated imagery. Replace with verified company photography.
const maintenanceImage = "/images/maintenance-temporary-illustration.webp";

export function HomeJourneySupport({
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
      <section
        className="home-journey audience-scene"
        data-audience-scene
        aria-labelledby="home-journey-heading"
      >
        <div className="home-journey-introduction">
          <h2 id="home-journey-heading">
            {t("pages.forHome.journey.title")}
          </h2>
          <p>{t("pages.forHome.journey.introduction")}</p>
        </div>
        <ol>
          {journeySteps.map((step) => (
            <li key={step}>{t(`pages.forHome.journey.steps.${step}`)}</li>
          ))}
        </ol>
      </section>

      <section
        className="home-maintenance audience-scene"
        data-audience-scene
        aria-labelledby="home-maintenance-heading"
      >
        <div className="home-maintenance-media audience-scene-media">
          <Image
            alt={t("pages.forHome.support.imageAlt")}
            className="audience-cover-image"
            fill
            quality={90}
            sizes="(min-width: 64rem) 54vw, 100vw"
            src={maintenanceImage}
          />
        </div>
        <div className="home-maintenance-copy audience-scene-copy">
          <h2 id="home-maintenance-heading">
            {t("pages.forHome.support.title")}
          </h2>
          <p>{t("pages.forHome.support.description")}</p>
          <ul>
            {maintenanceItems.map((item) => (
              <li key={item}>{t(`pages.forHome.support.items.${item}`)}</li>
            ))}
          </ul>
          <div className="audience-actions">
            <ButtonLink
              href={localizedPath(locale, "maintenance")}
              variant="secondary"
            >
              {t("pages.forHome.support.maintenanceCta")}
            </ButtonLink>
            <ButtonLink
              href={localizedPath(locale, "shop")}
              variant="informational"
            >
              <span>{t("pages.forHome.support.shopCta")}</span>
              <AudienceArrow />
            </ButtonLink>
          </div>
        </div>
      </section>

      <section
        className="audience-closing home-closing"
        aria-labelledby="home-closing-heading"
      >
        <div>
          <h2 id="home-closing-heading">
            {t("pages.forHome.closing.title")}
          </h2>
          <p>{t("pages.forHome.closing.description")}</p>
        </div>
        <div className="audience-closing-actions">
          <ButtonLink href={installationHref} variant="primary">
            {t("pages.forHome.closing.installationCta")}
          </ButtonLink>
          <ButtonLink href={autonomyHref} variant="secondary">
            {t("pages.forHome.closing.autonomyCta")}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
