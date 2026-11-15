import { ButtonLink } from "@/components/button";
import { localizedPath } from "../_lib/routes";
import { HomepageArrow } from "./homepage-arrow";

type Translate = (key: string) => string;

export function HomepageContact({
  locale,
  t,
}: {
  locale: string;
  t: Translate;
}) {
  return (
    <section className="welcome-contact" aria-labelledby="contact-heading">
      <div className="welcome-contact-content">
        <h2 id="contact-heading">{t("pages.home.contact.title")}</h2>
        <div>
          <p>{t("pages.home.contact.description")}</p>
          <ButtonLink href={localizedPath(locale, "contact")}>
            <span>{t("pages.home.contact.cta")}</span>
            <HomepageArrow />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
