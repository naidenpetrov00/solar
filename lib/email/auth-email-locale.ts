import "server-only";

import {
  localizedPath,
  supportedLocales,
  type SupportedLocale,
} from "@/app/[locale]/_lib/routes";

type AuthEmailCallbackRoute = "verify-email" | "reset-password";

export function resolveAuthEmailLocale(
  generatedUrl: string,
  callbackRoute: AuthEmailCallbackRoute,
  trustedApplicationUrl: string,
): SupportedLocale {
  try {
    const trustedUrl = new URL(trustedApplicationUrl);
    const emailUrl = new URL(generatedUrl);

    if (emailUrl.origin !== trustedUrl.origin) {
      return "bg";
    }

    const callbackValue = emailUrl.searchParams.get("callbackURL");

    if (!callbackValue) {
      return "bg";
    }

    const callbackUrl = new URL(callbackValue, trustedUrl);

    if (callbackUrl.origin !== trustedUrl.origin) {
      return "bg";
    }

    const locale = supportedLocales.find(
      (candidate) =>
        callbackUrl.pathname === localizedPath(candidate, callbackRoute),
    );

    return locale ?? "bg";
  } catch {
    return "bg";
  }
}
