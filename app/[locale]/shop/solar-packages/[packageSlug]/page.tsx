import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { getT } from "@/i18n.server";
import { PackageDetailScrollReset } from "../../../_components/package-detail-scroll-reset";
import { AddToCartButton } from "../../../_components/add-to-cart-button";
import { findSolarPackage, getSolarPackagePath, solarPackages } from "../../../_lib/solar-packages";
import { formatBgnPrice } from "../../../_lib/shop-catalog";
import { localizedAlternates, localizedPath } from "../../../_lib/routes";

type PackagePageProps = {
  params: Promise<{ locale: string; packageSlug: string }>;
};

function getPackageKey(packageId: string, key: string) {
  return `pages.home.residential.packages.${packageId}.${key}`;
}

export function generateStaticParams() {
  return solarPackages.map(({ slug }) => ({ packageSlug: slug }));
}

export async function generateMetadata({ params }: PackagePageProps): Promise<Metadata> {
  const { locale, packageSlug } = await params;
  const solarPackage = findSolarPackage(packageSlug);

  if (!solarPackage) return {};

  const { t } = await getT("common", { lng: locale });
  const path = getSolarPackagePath(packageSlug);
  const title = t(getPackageKey(solarPackage.id, "name"));
  const description = t(getPackageKey(solarPackage.id, "description"));

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: localizedAlternates(path),
    },
    openGraph: { title, description, locale, type: "website" },
  };
}

export default async function SolarPackagePage({ params }: PackagePageProps) {
  const { locale, packageSlug } = await params;
  const solarPackage = findSolarPackage(packageSlug);

  if (!solarPackage) notFound();

  const { t } = await getT("common", { lng: locale });
  const key = (name: string) => getPackageKey(solarPackage.id, name);
  const specifications = t(key("specifications"), { returnObjects: true }) as string[];
  const features = t(key("features"), { returnObjects: true }) as string[];

  return (
    <main id="main-content" className="solar-package-page">
      <PackageDetailScrollReset />
      <nav aria-label={t("pages.home.residential.breadcrumbLabel")} className="solar-package-breadcrumb">
        <ol>
          <li>
            <Link href={localizedPath(locale, "shop")} scroll>
              {t("navigation.shop")}
            </Link>
          </li>
          <li>
            <Link href={localizedPath(locale, "shop/solar-packages")} scroll>
              {t("pages.solarPackages.title")}
            </Link>
          </li>
          <li aria-current="page">{t(key("name"))}</li>
        </ol>
      </nav>
      <ViewTransition
        default="none"
        enter={{ "package-detail": "package-detail-in", default: "none" }}
      >
        <article className="solar-package">
          <div className="solar-package-detail">
            <div aria-hidden="true" className="solar-package-detail-visual" />
            <div className="solar-package-detail-summary">
              <p className="solar-package-detail-type">{t(key("energyType"))}</p>
              <h1>{t(key("name"))}</h1>
              <p className="solar-package-detail-profile">{t(key("profile"))}</p>
              <p className="solar-package-detail-price">
                <span>{t("pages.home.residential.packagePrice")}</span>
                <strong>{formatBgnPrice(locale, solarPackage.priceBgn)}</strong>
              </p>
              <div className="solar-package-detail-actions">
                <Link className="solar-package-detail-cta" href={localizedPath(locale, "contact")}>
                  {t("pages.home.residential.quote")}
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
                </Link>
                <AddToCartButton
                  id={solarPackage.id}
                  name={t(key("name"))}
                  addLabel={t("pages.shop.addToCart")}
                  addedLabel={t("pages.shop.addedToCart")}
                  accessibleLabel={t("pages.shop.addNamedToCart", { name: t(key("name")) })}
                />
              </div>
            </div>
          </div>
          <div className="solar-package-detail-secondary">
            <p className="solar-package-price-note">{t("pages.home.residential.packagePriceNote")}</p>
            <ul className="solar-package-detail-specifications">
              {specifications.map((specification) => <li key={specification}>{specification}</li>)}
            </ul>
          </div>
        </article>
      </ViewTransition>

      <section aria-labelledby="solar-package-description-heading" className="solar-package-description">
        <h2 id="solar-package-description-heading">{t("pages.home.residential.detailHeading")}</h2>
        <p>{t(key("description"))}</p>
        <ul>
          {features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
      </section>
    </main>
  );
}
