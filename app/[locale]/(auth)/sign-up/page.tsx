import Link from "next/link";

import { getT } from "@/i18n.server";
import { isFacebookSignInEnabled } from "@/lib/facebook-auth";
import { isGoogleSignInEnabled } from "@/lib/google-auth";
import { AuthShell } from "../_components/auth-shell";
import { SignUpForm } from "../_components/sign-up-form";
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
  return getAuthPageMetadata(locale, "sign-up", "auth.signUp");
}

export default async function SignUpPage({
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
      title={t("auth:pages.auth.signUp.title")}
      description={t("auth:pages.auth.signUp.description")}
      footer={
        <p>
          {t("auth:pages.auth.signUp.hasAccount")}{" "}
          <Link href={localizedAuthPath(locale, "sign-in", returnTo)}>
            {t("auth:pages.auth.signUp.signIn")}
          </Link>
        </p>
      }
    >
      <SignUpForm
        verificationCallbackURL={localizedVerificationCallbackPath(
          locale,
          returnTo,
        )}
        forgotPasswordHref={localizedAuthPath(
          locale,
          "forgot-password",
          returnTo,
        )}
        socialSignIn={{
          google: {
            enabled: isGoogleSignInEnabled,
            callbackURL: returnTo,
            errorCallbackURL: localizedSocialErrorPath(
              locale,
              "sign-up",
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
              "sign-up",
              returnTo,
              "facebook",
            ),
            errorCode: errorProvider === "facebook" ? errorCode : undefined,
          },
        }}
        labels={{
          name: t("auth:pages.auth.fields.name"),
          email: t("auth:pages.auth.fields.email"),
          password: t("auth:pages.auth.fields.password"),
          passwordHint: t("auth:pages.auth.fields.passwordHint"),
          confirmPassword: t("auth:pages.auth.fields.confirmPassword"),
          submit: t("auth:pages.auth.signUp.submit"),
          submitting: t("auth:pages.auth.signUp.submitting"),
          validationSummary: t("auth:pages.auth.errors.validationSummary"),
          nameRequired: t("auth:pages.auth.errors.nameRequired"),
          nameLength: t("auth:pages.auth.errors.nameLength"),
          emailRequired: t("auth:pages.auth.errors.emailRequired"),
          emailInvalid: t("auth:pages.auth.errors.emailInvalid"),
          passwordRequired: t("auth:pages.auth.errors.passwordRequired"),
          passwordLength: t("auth:pages.auth.errors.passwordLength"),
          passwordMismatch: t("auth:pages.auth.errors.passwordMismatch"),
          rateLimited: t("auth:pages.auth.errors.rateLimited"),
          genericError: t("auth:pages.auth.errors.signUpFailed"),
          checkEmailTitle: t("auth:pages.auth.signUp.checkEmailTitle"),
          checkEmailDescription: t(
            "auth:pages.auth.signUp.checkEmailDescription",
          ),
          deliveryHelp: t("auth:pages.auth.signUp.deliveryHelp"),
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
