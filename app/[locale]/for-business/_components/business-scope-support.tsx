import Image from "next/image";
import { ButtonLink } from "@/components/button";
import { AudienceArrow } from "../../_components/audience-arrow";
import { audienceContactPath } from "../../_lib/audience-contact-path";
import { localizedPath } from "../../_lib/routes";

type Translate = (key: string) => string;

const scopeSteps = [
  "preliminary",
  "equipment",
  "delivery",
  "installation",
  "documentation",
] as const;
const maintenanceItems = [
  "cleaning",
  "siteCare",
  "inspection",
  "technical",
] as const;

// Temporary generated imagery. Replace with verified company photography.
const maintenanceImage = "/images/maintenance-temporary-illustration.webp";

export function BusinessScopeSupport({
  locale,
  t,
}: {
  locale: string;
  t: Translate;
}) {
  const contactHref = audienceContactPath(locale, {
    audience: "business",
    service: "installation",
  });

  return (
    <>
      <section
        className="business-scope audience-scene"
        data-audience-scene
        aria-labelledby="business-scope-heading"
      >
        <div className="business-scope-introduction">
          <h2 id="business-scope-heading">
            {t("pages.forBusiness.scope.title")}
          </h2>
          <p>{t("pages.forBusiness.scope.introduction")}</p>
        </div>
        <ol>
          {scopeSteps.map((step) => (
            <li key={step}>{t(`pages.forBusiness.scope.steps.${step}`)}</li>
          ))}
        </ol>
        <p className="business-equipment-note">
          {t("pages.forBusiness.scope.customerEquipment")}
        </p>
      </section>

      <section
        className="business-maintenance audience-scene"
        data-audience-scene
        aria-labelledby="business-maintenance-heading"
      >
        <div className="business-maintenance-media audience-scene-media">
          <Image
            alt={t("pages.forBusiness.maintenance.imageAlt")}
            className="audience-cover-image"
            fill
            quality={90}
            sizes="(min-width: 64rem) 54vw, 100vw"
            src={maintenanceImage}
          />
        </div>
        <div className="business-maintenance-copy audience-scene-copy">
          <h2 id="business-maintenance-heading">
            {t("pages.forBusiness.maintenance.title")}
          </h2>
          <p>{t("pages.forBusiness.maintenance.description")}</p>
          <ul>
            {maintenanceItems.map((item) => (
              <li key={item}>
                {t(`pages.forBusiness.maintenance.items.${item}`)}
              </li>
            ))}
          </ul>
          <div className="audience-actions">
            <ButtonLink
              href={localizedPath(locale, "maintenance")}
              variant="secondary"
            >
              {t("pages.forBusiness.maintenance.cta")}
            </ButtonLink>
            <ButtonLink
              href={localizedPath(locale, "shop")}
              variant="informational"
            >
              <span>{t("pages.forBusiness.maintenance.shopCta")}</span>
              <AudienceArrow />
            </ButtonLink>
          </div>
        </div>
      </section>

      <section
        className="audience-closing business-closing"
        aria-labelledby="business-closing-heading"
      >
        <div>
          <h2 id="business-closing-heading">
            {t("pages.forBusiness.closing.title")}
          </h2>
          <p>{t("pages.forBusiness.closing.description")}</p>
        </div>
        <ButtonLink href={contactHref} variant="primary">
          {t("pages.forBusiness.closing.cta")}
        </ButtonLink>
      </section>
    </>
  );
}
