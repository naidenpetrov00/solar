import Link from "next/link";

import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "../_components/forgot-password-form";
import {
  getAuthPageMetadata,
  getSignedOutReturnPath,
  type AuthSearchParams,
} from "../_lib/auth-page";
import {
  localizedAuthPath,
  localizedPasswordResetCallbackPath,
} from "../../_lib/auth-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return getAuthPageMetadata(locale, "forgot-password", "auth.forgotPassword");
}

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AuthSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const returnTo = await getSignedOutReturnPath(locale, query.returnTo);
  const { t } = await getT(["common", "auth"], { lng: locale });
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);

  return (
    <AuthShell
      title={t("auth:pages.auth.forgotPassword.title")}
      description={t("auth:pages.auth.forgotPassword.description")}
      footer={
        <p>
          <Link href={signInHref}>
            {t("auth:pages.auth.common.backToSignIn")}
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm
        resetCallbackURL={localizedPasswordResetCallbackPath(locale, returnTo)}
        labels={{
          email: t("auth:pages.auth.fields.email"),
          submit: t("auth:pages.auth.forgotPassword.submit"),
          submitting: t("auth:pages.auth.forgotPassword.submitting"),
          validationSummary: t("auth:pages.auth.errors.validationSummary"),
          emailRequired: t("auth:pages.auth.errors.emailRequired"),
          emailInvalid: t("auth:pages.auth.errors.emailInvalid"),
          rateLimited: t("auth:pages.auth.errors.rateLimited"),
          genericError: t("auth:pages.auth.errors.recoveryRequestFailed"),
          successTitle: t("auth:pages.auth.forgotPassword.successTitle"),
          successDescription: t(
            "auth:pages.auth.forgotPassword.successDescription",
          ),
        }}
      />
    </AuthShell>
  );
}
