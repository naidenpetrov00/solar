import type { I18nConfig } from "next-i18next/proxy";

const i18nConfig = {
  supportedLngs: ["bg", "en", "tr", "uk"],
  fallbackLng: "bg",
  defaultNS: "common",
  ns: ["common"],
  localeInPath: true,
  localeParamName: "locale",
  hideDefaultLocale: true,
  reloadOnPrerender: process.env.NODE_ENV === "development",
  resourceLoader: (language, namespace) =>
    import(`./i18n/locales/${language}/${namespace}.json`),
} satisfies I18nConfig;

export default i18nConfig;
