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
} from "../../_lib/auth-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
  const { t } = await getT(["common", "auth"], { lng: locale });

  return (
    <AuthShell
      title={t("auth:pages.auth.signIn.title")}
      description={t("auth:pages.auth.signIn.description")}
      footer={
        <p>
          {t("auth:pages.auth.signIn.noAccount")}{" "}
          <Link href={localizedAuthPath(locale, "sign-up", returnTo)}>
            {t("auth:pages.auth.signIn.createAccount")}
          </Link>
        </p>
      }
    >
      <SignInForm
        returnTo={returnTo}
        forgotPasswordHref={localizedAuthPath(
          locale,
          "forgot-password",
          returnTo,
        )}
        verificationCallbackURL={localizedVerificationCallbackPath(
          locale,
          returnTo,
        )}
        socialSignIn={{
          google: {
            enabled: isGoogleSignInEnabled,
            callbackURL: returnTo,
            errorCallbackURL: localizedSocialErrorPath(
              locale,
              "sign-in",
              returnTo,
              "google",
            ),
            errorCode: errorProvider === "facebook" ? undefined : errorCode,
          },
          facebook: {
            enabled: isFacebookSignInEnabled,
            callbackURL: returnTo,
            errorCallbackURL: localizedSocialErrorPath(
              locale,
              "sign-in",
              returnTo,
              "facebook",
            ),
            errorCode: errorProvider === "facebook" ? errorCode : undefined,
          },
        }}
        labels={{
          email: t("auth:pages.auth.fields.email"),
          password: t("auth:pages.auth.fields.password"),
          submit: t("auth:pages.auth.signIn.submit"),
          submitting: t("auth:pages.auth.signIn.submitting"),
          validationSummary: t("auth:pages.auth.errors.validationSummary"),
          emailRequired: t("auth:pages.auth.errors.emailRequired"),
          emailInvalid: t("auth:pages.auth.errors.emailInvalid"),
          passwordRequired: t("auth:pages.auth.errors.passwordRequired"),
          invalidCredentials: t("auth:pages.auth.errors.invalidCredentials"),
          rateLimited: t("auth:pages.auth.errors.rateLimited"),
          genericError: t("auth:pages.auth.errors.signInFailed"),
          forgotPassword: t("auth:pages.auth.signIn.forgotPassword"),
          unverifiedTitle: t("auth:pages.auth.signIn.unverifiedTitle"),
          unverifiedDescription: t(
            "auth:pages.auth.signIn.unverifiedDescription",
          ),
          tryAnotherEmail: t("auth:pages.auth.signIn.tryAnotherEmail"),
          google: {
            continue: t("auth:pages.auth.google.continue"),
            unavailable: t("auth:pages.auth.google.unavailable"),
            redirecting: t("auth:pages.auth.google.redirecting"),
            failureTitle: t("auth:pages.auth.google.failureTitle"),
            failureDescription: t("auth:pages.auth.google.failureDescription"),
            emailNotFoundTitle: t("auth:pages.auth.google.emailNotFoundTitle"),
            emailNotFoundDescription: t(
              "auth:pages.auth.google.emailNotFoundDescription",
            ),
            emailNotVerifiedTitle: t(
              "auth:pages.auth.google.emailNotVerifiedTitle",
            ),
            emailNotVerifiedDescription: t(
              "auth:pages.auth.google.emailNotVerifiedDescription",
            ),
            accountNotLinkedTitle: t(
              "auth:pages.auth.google.accountNotLinkedTitle",
            ),
            accountNotLinkedDescription: t(
              "auth:pages.auth.google.accountNotLinkedDescription",
            ),
            passwordRecovery: t("auth:pages.auth.google.passwordRecovery"),
            recoverySteps: {
              resetPassword: t(
                "auth:pages.auth.google.recoverySteps.resetPassword",
              ),
              signIn: t("auth:pages.auth.google.recoverySteps.signIn"),
              verifyEmail: t(
                "auth:pages.auth.google.recoverySteps.verifyEmail",
              ),
              retry: t("auth:pages.auth.google.recoverySteps.retry"),
            },
          },
          facebook: {
            continue: t("auth:pages.auth.facebook.continue"),
            unavailable: t("auth:pages.auth.facebook.unavailable"),
            redirecting: t("auth:pages.auth.facebook.redirecting"),
            failureTitle: t("auth:pages.auth.facebook.failureTitle"),
            failureDescription: t(
              "auth:pages.auth.facebook.failureDescription",
            ),
            emailNotFoundTitle: t(
              "auth:pages.auth.facebook.emailNotFoundTitle",
            ),
            emailNotFoundDescription: t(
              "auth:pages.auth.facebook.emailNotFoundDescription",
            ),
            emailNotVerifiedTitle: t(
              "auth:pages.auth.facebook.emailNotVerifiedTitle",
            ),
            emailNotVerifiedDescription: t(
              "auth:pages.auth.facebook.emailNotVerifiedDescription",
            ),
            accountNotLinkedTitle: t(
              "auth:pages.auth.facebook.accountNotLinkedTitle",
            ),
            accountNotLinkedDescription: t(
              "auth:pages.auth.facebook.accountNotLinkedDescription",
            ),
            passwordRecovery: t("auth:pages.auth.facebook.passwordRecovery"),
          },
          verificationRequest: {
            email: t("auth:pages.auth.fields.email"),
            submit: t("auth:pages.auth.verificationRequest.submit"),
            submitting: t("auth:pages.auth.verificationRequest.submitting"),
            accepted: t("auth:pages.auth.verificationRequest.accepted"),
            validationSummary: t("auth:pages.auth.errors.validationSummary"),
            emailRequired: t("auth:pages.auth.errors.emailRequired"),
            emailInvalid: t("auth:pages.auth.errors.emailInvalid"),
            rateLimited: t("auth:pages.auth.errors.rateLimited"),
            genericError: t("auth:pages.auth.errors.verificationRequestFailed"),
          },
        }}
      />
    </AuthShell>
  );
}
