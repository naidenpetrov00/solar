import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "next-i18next/client";
import { getResources, getT, generateI18nStaticParams } from "@/i18n.server";
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
  const { i18n } = await getT("common", { lng: locale });
  const resources = getResources(i18n, ["common"], [locale, "bg"]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider language={locale} resources={resources}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
