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
import { localizedAuthPath } from "../../_lib/auth-routes";
import { safeAuthReturnPath } from "../../_lib/return-paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
  const { t } = await getT(["common", "auth"], { lng: locale });
  const tokenValue = getQueryValue(query.token);
  const token =
    tokenValue && tokenValue.length <= 2048 ? tokenValue : undefined;
  const error = getQueryValue(query.error);
  const returnTo = safeAuthReturnPath(query.returnTo, locale);
  const signInHref = localizedAuthPath(locale, "sign-in", returnTo);
  const forgotPasswordHref = localizedAuthPath(
    locale,
    "forgot-password",
    returnTo,
  );

  let content;

  if (error && error !== "INVALID_TOKEN") {
    content = (
      <AuthState
        tone="error"
        title={t("auth:pages.auth.resetPassword.failureTitle")}
        description={t("auth:pages.auth.resetPassword.failureDescription")}
        link={{
          href: forgotPasswordHref,
          label: t("auth:pages.auth.resetPassword.requestAnother"),
        }}
      />
    );
  } else if (!token || error === "INVALID_TOKEN") {
    content = (
      <AuthState
        tone="error"
        title={t("auth:pages.auth.resetPassword.invalidOrExpiredTitle")}
        description={t(
          "auth:pages.auth.resetPassword.invalidOrExpiredDescription",
        )}
        link={{
          href: forgotPasswordHref,
          label: t("auth:pages.auth.resetPassword.requestAnother"),
        }}
      />
    );
  } else {
    content = (
      <ResetPasswordForm
        token={token}
        signInHref={signInHref}
        labels={{
          password: t("auth:pages.auth.fields.newPassword"),
          passwordHint: t("auth:pages.auth.fields.passwordHint"),
          confirmPassword: t("auth:pages.auth.fields.confirmPassword"),
          submit: t("auth:pages.auth.resetPassword.submit"),
          submitting: t("auth:pages.auth.resetPassword.submitting"),
          validationSummary: t("auth:pages.auth.errors.validationSummary"),
          passwordRequired: t("auth:pages.auth.errors.passwordRequired"),
          passwordLength: t("auth:pages.auth.errors.passwordLength"),
          passwordMismatch: t("auth:pages.auth.errors.passwordMismatch"),
          invalidToken: t("auth:pages.auth.errors.resetTokenInvalid"),
          rateLimited: t("auth:pages.auth.errors.rateLimited"),
          genericError: t("auth:pages.auth.errors.resetFailed"),
          successTitle: t("auth:pages.auth.resetPassword.successTitle"),
          successDescription: t(
            "auth:pages.auth.resetPassword.successDescription",
          ),
          signIn: t("auth:pages.auth.common.backToSignIn"),
        }}
      />
    );
  }

  return (
    <AuthShell
      title={t("auth:pages.auth.resetPassword.title")}
      description={t("auth:pages.auth.resetPassword.description")}
      footer={
        <p>
          <Link href={signInHref}>
            {t("auth:pages.auth.common.backToSignIn")}
          </Link>
        </p>
      }
    >
      {content}
    </AuthShell>
  );
}
