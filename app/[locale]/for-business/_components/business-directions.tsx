import Image from "next/image";
import { ButtonLink } from "@/components/button";
import { audienceContactPath } from "../../_lib/audience-contact-path";

type Translate = (key: string) => string;

// Temporary generated warehouse image and licensed solar-park image.
// Solar park source: https://unsplash.com/photos/n2Q4QtRNeUg (Unsplash License).
const businessMedia = {
  property: "/images/business-temporary-illustration.webp",
  park: "/images/welcome-solar-hero.jpg",
} as const;

export function BusinessDirections({
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
  const propertyHref = audienceContactPath(locale, {
    audience: "business",
    service: "installation",
    project: "business-property",
  });
  const parkHref = audienceContactPath(locale, {
    audience: "business",
    service: "installation",
    project: "investor-park",
  });

  return (
    <>
      <section
        className="business-audience-hero"
        aria-labelledby="business-heading"
      >
        <div className="business-audience-hero-copy">
          <h1 id="business-heading">{t("pages.forBusiness.hero.headline")}</h1>
          <p>{t("pages.forBusiness.hero.introduction")}</p>
          <ButtonLink href={contactHref} variant="primary">
            {t("pages.forBusiness.hero.cta")}
          </ButtonLink>
        </div>
        <div className="business-audience-hero-media">
          <Image
            alt=""
            className="audience-cover-image"
            fill
            preload
            quality={90}
            sizes="(min-width: 64rem) 56vw, 100vw"
            src={businessMedia.property}
          />
        </div>
      </section>

      <section
        className="business-directions audience-scene"
        data-audience-scene
        aria-labelledby="business-directions-heading"
      >
        <h2 id="business-directions-heading">
          {t("pages.forBusiness.directions.title")}
        </h2>
        <div className="business-direction-copy">
          <article>
            <h3>{t("pages.forBusiness.directions.properties.title")}</h3>
            <p>{t("pages.forBusiness.directions.properties.description")}</p>
            <ButtonLink href={propertyHref} variant="primary">
              {t("pages.forBusiness.directions.properties.cta")}
            </ButtonLink>
          </article>
          <article>
            <h3>{t("pages.forBusiness.directions.parks.title")}</h3>
            <p>{t("pages.forBusiness.directions.parks.description")}</p>
            <ButtonLink href={parkHref} variant="primary">
              {t("pages.forBusiness.directions.parks.cta")}
            </ButtonLink>
          </article>
        </div>
        <div className="business-park-media audience-scene-media">
          <Image
            alt={t("pages.forBusiness.directions.parks.imageAlt")}
            className="audience-cover-image"
            fill
            quality={90}
            sizes="100vw"
            src={businessMedia.park}
          />
        </div>
      </section>
    </>
  );
}
