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
} from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
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
  const { t } = await getT("common", { lng: locale });
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);

  return (
    <AuthShell
      title={t("pages.auth.forgotPassword.title")}
      description={t("pages.auth.forgotPassword.description")}
      footer={<p><Link href={signInHref}>{t("pages.auth.common.backToSignIn")}</Link></p>}
    >
      <ForgotPasswordForm
        resetCallbackURL={localizedPasswordResetCallbackPath(locale, returnTo)}
        labels={{
          email: t("pages.auth.fields.email"),
          submit: t("pages.auth.forgotPassword.submit"),
          submitting: t("pages.auth.forgotPassword.submitting"),
          validationSummary: t("pages.auth.errors.validationSummary"),
          emailRequired: t("pages.auth.errors.emailRequired"),
          emailInvalid: t("pages.auth.errors.emailInvalid"),
          rateLimited: t("pages.auth.errors.rateLimited"),
          genericError: t("pages.auth.errors.recoveryRequestFailed"),
          successTitle: t("pages.auth.forgotPassword.successTitle"),
          successDescription: t("pages.auth.forgotPassword.successDescription"),
        }}
      />
    </AuthShell>
  );
}
