import Link from "next/link";

import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { AuthState } from "../_components/auth-state";
import { ResetPasswordForm } from "../_components/reset-password-form";
import {
  getAuthPageMetadata,
  getQueryValue,
  type AuthSearchParams,
} from "../_lib/auth-page";
import { localizedAuthPath, safeInternalReturnPath } from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return getAuthPageMetadata(locale, "reset-password", "auth.resetPassword");
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AuthSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const { t } = await getT("common", { lng: locale });
  const tokenValue = getQueryValue(query.token);
  const token = tokenValue && tokenValue.length <= 2048 ? tokenValue : undefined;
  const error = getQueryValue(query.error);
  const returnTo = safeInternalReturnPath(query.returnTo, locale);
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);
  const forgotPasswordHref = localizedAuthPath(locale, "forgot-password", returnTo);

  let content;

  if (error && error !== "INVALID_TOKEN") {
    content = (
      <AuthState
        tone="error"
        title={t("pages.auth.resetPassword.failureTitle")}
        description={t("pages.auth.resetPassword.failureDescription")}
        link={{
          href: forgotPasswordHref,
          label: t("pages.auth.resetPassword.requestAnother"),
        }}
      />
    );
  } else if (!token || error === "INVALID_TOKEN") {
    content = (
      <AuthState
        tone="error"
        title={t("pages.auth.resetPassword.invalidOrExpiredTitle")}
        description={t("pages.auth.resetPassword.invalidOrExpiredDescription")}
        link={{
          href: forgotPasswordHref,
          label: t("pages.auth.resetPassword.requestAnother"),
        }}
      />
    );
  } else {
    content = (
      <ResetPasswordForm
        token={token}
        signInHref={signInHref}
        labels={{
          password: t("pages.auth.fields.newPassword"),
          passwordHint: t("pages.auth.fields.passwordHint"),
          confirmPassword: t("pages.auth.fields.confirmPassword"),
          submit: t("pages.auth.resetPassword.submit"),
          submitting: t("pages.auth.resetPassword.submitting"),
          validationSummary: t("pages.auth.errors.validationSummary"),
          passwordRequired: t("pages.auth.errors.passwordRequired"),
          passwordLength: t("pages.auth.errors.passwordLength"),
          passwordMismatch: t("pages.auth.errors.passwordMismatch"),
          invalidToken: t("pages.auth.errors.resetTokenInvalid"),
          rateLimited: t("pages.auth.errors.rateLimited"),
          genericError: t("pages.auth.errors.resetFailed"),
          successTitle: t("pages.auth.resetPassword.successTitle"),
          successDescription: t("pages.auth.resetPassword.successDescription"),
          signIn: t("pages.auth.common.backToSignIn"),
        }}
      />
    );
  }

  return (
    <AuthShell
      title={t("pages.auth.resetPassword.title")}
      description={t("pages.auth.resetPassword.description")}
      footer={<p><Link href={signInHref}>{t("pages.auth.common.backToSignIn")}</Link></p>}
    >
      {content}
    </AuthShell>
  );
}
