import Image from "next/image";
import { ButtonLink } from "@/components/button";
import { localizedPath } from "../_lib/routes";
import { HomepageArrow } from "./homepage-arrow";
import { HomepageDirectionsMotion } from "./homepage-directions-motion";

type Translate = (key: string) => string;

// Temporary generated illustrations. Replace with verified company photography.
const directionScenes = [
  {
    id: "home",
    route: "for-home",
    image: "/images/home-temporary-illustration.webp",
  },
  {
    id: "business",
    route: "for-business",
    image: "/images/business-temporary-illustration.webp",
  },
  {
    id: "maintenance",
    route: "maintenance",
    image: "/images/maintenance-temporary-illustration.webp",
  },
  {
    id: "shop",
    route: "shop",
    image: "/images/shop-temporary-illustration.webp",
  },
] as const;

function DirectionAction({ href, label }: { href: string; label: string }) {
  return (
    <ButtonLink
      className="welcome-direction-action"
      href={href}
      variant="informational"
    >
      <span>{label}</span>
      <HomepageArrow />
    </ButtonLink>
  );
}

export function HomepageDirections({
  locale,
  t,
}: {
  locale: string;
  t: Translate;
}) {
  return (
    <section
      className="welcome-directions"
      aria-labelledby="directions-heading"
    >
      <h2 id="directions-heading" className="sr-only">
        {t("pages.home.directions.title")}
      </h2>
      <HomepageDirectionsMotion />

      <div className="welcome-direction-sequence">
        {directionScenes.map((scene) => (
          <article
            className={`welcome-direction welcome-direction-${scene.id}`}
            key={scene.id}
          >
            <div className="welcome-direction-media">
              <Image
                alt=""
                fill
                sizes="(min-width: 48rem) 58vw, 100vw"
                src={scene.image}
              />
            </div>
            <div className="welcome-direction-copy">
              <h3>{t(`pages.home.directions.${scene.id}.title`)}</h3>
              <div className="welcome-direction-details">
                <p>{t(`pages.home.directions.${scene.id}.description`)}</p>
                <DirectionAction
                  href={localizedPath(locale, scene.route)}
                  label={t(`pages.home.directions.${scene.id}.cta`)}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
