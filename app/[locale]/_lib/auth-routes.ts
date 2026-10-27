import { localizedPath } from "./routes";
import type { AuthRouteSlug, SocialProviderSlug } from "./routes";
import { localizedReturnPath, safeAuthReturnPath } from "./return-paths";

const oauthCallbackErrorCodes = new Set([
  "account_already_linked_to_different_user",
  "account_not_linked",
  "email_does_not_match",
  "email_not_found",
  "email_not_verified",
  "invalid_code",
  "issuer_mismatch",
  "issuer_missing",
  "no_callback_url",
  "no_code",
  "nonce_binding_missing",
  "oauth_provider_not_found",
  "signup_disabled",
  "unable_to_create_session",
  "unable_to_create_user",
  "unable_to_get_user_info",
  "unable_to_link_account",
  "unable_to_update_account",
]);

const authQueryParameters: Record<AuthRouteSlug, readonly string[]> = {
  "sign-in": ["returnTo"],
  "sign-up": ["returnTo"],
  "forgot-password": ["returnTo"],
  "reset-password": ["token", "error", "returnTo"],
  "verify-email": ["status", "error", "returnTo"],
};

export function localizedAuthPath(
  locale: string,
  slug: AuthRouteSlug,
  returnTo?: string,
) {
  const path = localizedPath(locale, slug);

  if (!returnTo) {
    return path;
  }

  const query = new URLSearchParams({ returnTo });
  return `${path}?${query.toString()}`;
}

export function localizedSocialErrorPath(
  locale: string,
  slug: Extract<AuthRouteSlug, "sign-in" | "sign-up">,
  returnTo: string,
  provider: SocialProviderSlug,
) {
  const query = new URLSearchParams({
    returnTo: safeAuthReturnPath(returnTo, locale),
    provider,
  });
  return `${localizedPath(locale, slug)}?${query.toString()}`;
}

export function localizedAuthLanguagePath(
  sourceLocale: string,
  targetLocale: string,
  slug: AuthRouteSlug,
  searchParams: Pick<URLSearchParams, "get">,
) {
  const query = new URLSearchParams();

  for (const parameter of authQueryParameters[slug]) {
    const value = searchParams.get(parameter);

    if (value === null) {
      continue;
    }

    query.set(
      parameter,
      parameter === "returnTo"
        ? localizedReturnPath(sourceLocale, targetLocale, value)
        : value,
    );
  }

  if (slug === "sign-in" || slug === "sign-up") {
    const provider = searchParams.get("provider");
    const error = searchParams.get("error");

    if (isSocialProviderSlug(provider) && isOAuthCallbackErrorCode(error)) {
      query.set("provider", provider);
      query.set("error", error);
    }
  }

  const path = localizedPath(targetLocale, slug);
  return query.size === 0 ? path : `${path}?${query.toString()}`;
}

function isSocialProviderSlug(
  value: string | null,
): value is SocialProviderSlug {
  return value === "google" || value === "facebook";
}

function isOAuthCallbackErrorCode(value: string | null): value is string {
  return value !== null && oauthCallbackErrorCodes.has(value);
}

export function localizedVerificationCallbackPath(
  locale: string,
  returnTo: string | string[] | undefined,
) {
  const query = new URLSearchParams({
    status: "success",
    returnTo: safeAuthReturnPath(returnTo, locale),
  });

  return `${localizedPath(locale, "verify-email")}?${query.toString()}`;
}

export function localizedPasswordResetCallbackPath(
  locale: string,
  returnTo: string | string[] | undefined,
) {
  const query = new URLSearchParams({
    returnTo: safeAuthReturnPath(returnTo, locale),
  });

  return `${localizedPath(locale, "reset-password")}?${query.toString()}`;
}
