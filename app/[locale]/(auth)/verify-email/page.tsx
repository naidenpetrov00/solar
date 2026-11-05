import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { AuthState } from "../_components/auth-state";
import { VerificationRequestForm } from "../_components/verification-request-form";
import {
  getAuthPageMetadata,
  getQueryValue,
  type AuthSearchParams,
} from "../_lib/auth-page";
import {
  localizedAuthPath,
  localizedVerificationCallbackPath,
} from "../../_lib/auth-routes";
import { safeAuthReturnPath } from "../../_lib/return-paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getAuthPageMetadata(locale, "verify-email", "auth.verifyEmail");
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AuthSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const { t } = await getT(["common", "auth"], { lng: locale });
  const status = getQueryValue(query.status);
  const error = getQueryValue(query.error);
  const returnTo = safeAuthReturnPath(query.returnTo, locale);
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);
  const callbackURL = localizedVerificationCallbackPath(locale, returnTo);

  let state: "initial" | "success" | "expired" | "invalid" | "failure" =
    "initial";

  if (error === "TOKEN_EXPIRED") state = "expired";
  else if (error === "INVALID_TOKEN") state = "invalid";
  else if (error) state = "failure";
  else if (status === "success") state = "success";

  const showResend = state !== "success";

  return (
    <AuthShell
      title={t("auth:pages.auth.verifyEmail.title")}
      description={t("auth:pages.auth.verifyEmail.description")}
    >
      <AuthState
        tone={
          state === "success"
            ? "success"
            : state === "initial"
              ? "neutral"
              : "error"
        }
        title={t(`auth:pages.auth.verifyEmail.states.${state}.title`)}
        description={t(
          `auth:pages.auth.verifyEmail.states.${state}.description`,
        )}
        link={{
          href: signInHref,
          label: t("auth:pages.auth.common.backToSignIn"),
        }}
      />
      {showResend ? (
        <VerificationRequestForm
          callbackURL={callbackURL}
          labels={{
            email: t("auth:pages.auth.fields.email"),
            submit: t("auth:pages.auth.verificationRequest.submit"),
            submitting: t("auth:pages.auth.verificationRequest.submitting"),
            accepted: t("auth:pages.auth.verificationRequest.accepted"),
            validationSummary: t("auth:pages.auth.errors.validationSummary"),
            emailRequired: t("auth:pages.auth.errors.emailRequired"),
            emailInvalid: t("auth:pages.auth.errors.emailInvalid"),
            rateLimited: t("auth:pages.auth.errors.rateLimited"),
            genericError: t("auth:pages.auth.errors.verificationRequestFailed"),
          }}
        />
      ) : null}
    </AuthShell>
  );
}
