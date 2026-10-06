import Link from "next/link";

import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { SignInForm } from "../_components/sign-in-form";
import {
  getAuthPageMetadata,
  getSignedOutReturnPath,
  type AuthSearchParams,
} from "../_lib/auth-page";
import {
  localizedAuthPath,
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
