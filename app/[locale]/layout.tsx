import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "next-i18next/client";
import { getResources, getT, generateI18nStaticParams } from "@/i18n.server";
import { Navigation } from "./_components/navigation";
import { routeDefinitions, supportedLocales } from "./_lib/routes";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return generateI18nStaticParams<"locale">();
}

export async function generateMetadata(): Promise<Metadata> {
  const { t, lng } = await getT("common");

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    alternates: {
      languages: {
        bg: "/",
        en: "/en",
        tr: "/tr",
        uk: "/uk",
      },
    },
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      locale: lng,
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("solar-theme")?.value;
  const initialTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : undefined;
  const { t, i18n } = await getT("common", { lng: locale });
  const resources = getResources(i18n, ["common"], [locale, "bg"]);
  const navigationRoutes = routeDefinitions.map(({ slug, key }) => ({
    slug,
    label: t(`navigation.${key}`),
  }));
  const languageNames = Object.fromEntries(
    supportedLocales.map((supportedLocale) => [
      supportedLocale,
      t(`languages.${supportedLocale}`),
    ]),
  );

  return (
    <html
      lang={locale}
      data-theme={initialTheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="site-page min-h-full">
        <I18nProvider language={locale} resources={resources}>
          <a
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-zinc-950 focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
            href="#main-content"
          >
            {t("accessibility.skipToContent")}
          </a>
          <Navigation
            locale={locale}
            brandLabel={t("navigation.brand")}
            ctaLabel={t("navigation.requestQuote")}
            cartLabel={t("navigation.cart")}
            menuLabel={t("accessibility.openMenu")}
            closeMenuLabel={t("accessibility.closeMenu")}
            navigationLabel={t("accessibility.mainNavigation")}
            languageLabel={t("accessibility.languageNavigation")}
            themeLabel={t("accessibility.themeLabel")}
            themeLight={t("accessibility.themeLight")}
            themeDark={t("accessibility.themeDark")}
            initialTheme={initialTheme}
            languageNames={languageNames}
            routes={navigationRoutes}
          />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
