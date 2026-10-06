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
  safeInternalReturnPath,
} from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
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
  const { t } = await getT("common", { lng: locale });
  const status = getQueryValue(query.status);
  const error = getQueryValue(query.error);
  const returnTo = safeInternalReturnPath(query.returnTo, locale);
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);
  const callbackURL = localizedVerificationCallbackPath(locale, returnTo);

  let state: "initial" | "success" | "expired" | "invalid" | "failure" = "initial";

  if (error === "TOKEN_EXPIRED") state = "expired";
  else if (error === "INVALID_TOKEN") state = "invalid";
  else if (error) state = "failure";
  else if (status === "success") state = "success";

  const showResend = state !== "success";

  return (
    <AuthShell
      title={t("pages.auth.verifyEmail.title")}
      description={t("pages.auth.verifyEmail.description")}
    >
      <AuthState
        tone={state === "success" ? "success" : state === "initial" ? "neutral" : "error"}
        title={t(`pages.auth.verifyEmail.states.${state}.title`)}
        description={t(`pages.auth.verifyEmail.states.${state}.description`)}
        link={{ href: signInHref, label: t("pages.auth.common.backToSignIn") }}
      />
      {showResend ? (
        <VerificationRequestForm
          callbackURL={callbackURL}
          labels={{
            email: t("pages.auth.fields.email"),
            submit: t("pages.auth.verificationRequest.submit"),
            submitting: t("pages.auth.verificationRequest.submitting"),
            accepted: t("pages.auth.verificationRequest.accepted"),
            validationSummary: t("pages.auth.errors.validationSummary"),
            emailRequired: t("pages.auth.errors.emailRequired"),
            emailInvalid: t("pages.auth.errors.emailInvalid"),
            rateLimited: t("pages.auth.errors.rateLimited"),
            genericError: t("pages.auth.errors.verificationRequestFailed"),
          }}
        />
      ) : null}
    </AuthShell>
  );
}
