import Link from "next/link";

import { getT } from "@/i18n.server";
import { isFacebookSignInEnabled } from "@/lib/facebook-auth";
import { isGoogleSignInEnabled } from "@/lib/google-auth";
import { AuthShell } from "../_components/auth-shell";
import { SignInForm } from "../_components/sign-in-form";
import {
  getAuthPageMetadata,
  getQueryValue,
  getSignedOutReturnPath,
  type AuthSearchParams,
} from "../_lib/auth-page";
import {
  localizedAuthPath,
  localizedSocialErrorPath,
  localizedVerificationCallbackPath,
} from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return getAuthPageMetadata(locale, "sign-in", "auth.signIn");
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AuthSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const returnTo = await getSignedOutReturnPath(locale, query.returnTo);
  const errorCode = getQueryValue(query.error);
  const errorProvider = getQueryValue(query.provider);
  const { t } = await getT("common", { lng: locale });

  return (
    <AuthShell
      title={t("pages.auth.signIn.title")}
      description={t("pages.auth.signIn.description")}
      footer={
        <p>
          {t("pages.auth.signIn.noAccount")} {" "}
          <Link href={localizedAuthPath(locale, "sign-up", returnTo)}>
            {t("pages.auth.signIn.createAccount")}
          </Link>
        </p>
      }
    >
      <SignInForm
        returnTo={returnTo}
        forgotPasswordHref={localizedAuthPath(locale, "forgot-password", returnTo)}
        verificationCallbackURL={localizedVerificationCallbackPath(locale, returnTo)}
        socialSignIn={{
          google: {
            enabled: isGoogleSignInEnabled,
            callbackURL: returnTo,
            errorCallbackURL: localizedSocialErrorPath(locale, "sign-in", returnTo, "google"),
            errorCode: errorProvider === "facebook" ? undefined : errorCode,
          },
          facebook: {
            enabled: isFacebookSignInEnabled,
            callbackURL: returnTo,
            errorCallbackURL: localizedSocialErrorPath(locale, "sign-in", returnTo, "facebook"),
            errorCode: errorProvider === "facebook" ? errorCode : undefined,
          },
        }}
        labels={{
          email: t("pages.auth.fields.email"),
          password: t("pages.auth.fields.password"),
          submit: t("pages.auth.signIn.submit"),
          submitting: t("pages.auth.signIn.submitting"),
          validationSummary: t("pages.auth.errors.validationSummary"),
          emailRequired: t("pages.auth.errors.emailRequired"),
          emailInvalid: t("pages.auth.errors.emailInvalid"),
          passwordRequired: t("pages.auth.errors.passwordRequired"),
          invalidCredentials: t("pages.auth.errors.invalidCredentials"),
          rateLimited: t("pages.auth.errors.rateLimited"),
          genericError: t("pages.auth.errors.signInFailed"),
          forgotPassword: t("pages.auth.signIn.forgotPassword"),
          unverifiedTitle: t("pages.auth.signIn.unverifiedTitle"),
          unverifiedDescription: t("pages.auth.signIn.unverifiedDescription"),
          tryAnotherEmail: t("pages.auth.signIn.tryAnotherEmail"),
          google: {
            continue: t("pages.auth.google.continue"),
            unavailable: t("pages.auth.google.unavailable"),
            redirecting: t("pages.auth.google.redirecting"),
            failureTitle: t("pages.auth.google.failureTitle"),
            failureDescription: t("pages.auth.google.failureDescription"),
            emailNotFoundTitle: t("pages.auth.google.emailNotFoundTitle"),
            emailNotFoundDescription: t("pages.auth.google.emailNotFoundDescription"),
            emailNotVerifiedTitle: t("pages.auth.google.emailNotVerifiedTitle"),
            emailNotVerifiedDescription: t("pages.auth.google.emailNotVerifiedDescription"),
            accountNotLinkedTitle: t("pages.auth.google.accountNotLinkedTitle"),
            accountNotLinkedDescription: t("pages.auth.google.accountNotLinkedDescription"),
            passwordRecovery: t("pages.auth.google.passwordRecovery"),
            recoverySteps: {
              resetPassword: t("pages.auth.google.recoverySteps.resetPassword"),
              signIn: t("pages.auth.google.recoverySteps.signIn"),
              verifyEmail: t("pages.auth.google.recoverySteps.verifyEmail"),
              retry: t("pages.auth.google.recoverySteps.retry"),
            },
          },
          facebook: {
            continue: t("pages.auth.facebook.continue"),
            unavailable: t("pages.auth.facebook.unavailable"),
            redirecting: t("pages.auth.facebook.redirecting"),
            failureTitle: t("pages.auth.facebook.failureTitle"),
            failureDescription: t("pages.auth.facebook.failureDescription"),
            emailNotFoundTitle: t("pages.auth.facebook.emailNotFoundTitle"),
            emailNotFoundDescription: t("pages.auth.facebook.emailNotFoundDescription"),
            emailNotVerifiedTitle: t("pages.auth.facebook.emailNotVerifiedTitle"),
            emailNotVerifiedDescription: t("pages.auth.facebook.emailNotVerifiedDescription"),
            accountNotLinkedTitle: t("pages.auth.facebook.accountNotLinkedTitle"),
            accountNotLinkedDescription: t("pages.auth.facebook.accountNotLinkedDescription"),
            passwordRecovery: t("pages.auth.facebook.passwordRecovery"),
          },
          verificationRequest: {
            email: t("pages.auth.fields.email"),
            submit: t("pages.auth.verificationRequest.submit"),
            submitting: t("pages.auth.verificationRequest.submitting"),
            accepted: t("pages.auth.verificationRequest.accepted"),
            validationSummary: t("pages.auth.errors.validationSummary"),
            emailRequired: t("pages.auth.errors.emailRequired"),
            emailInvalid: t("pages.auth.errors.emailInvalid"),
            rateLimited: t("pages.auth.errors.rateLimited"),
            genericError: t("pages.auth.errors.verificationRequestFailed"),
          },
        }}
      />
    </AuthShell>
  );
}
