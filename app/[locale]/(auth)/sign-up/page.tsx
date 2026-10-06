import Link from "next/link";

import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { SignUpForm } from "../_components/sign-up-form";
import {
  getAuthPageMetadata,
  getSignedOutReturnPath,
  type AuthSearchParams,
} from "../_lib/auth-page";
import { localizedAuthPath } from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
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
  const { t } = await getT("common", { lng: locale });

  return (
    <AuthShell
      title={t("pages.auth.signUp.title")}
      description={t("pages.auth.signUp.description")}
      footer={
        <p>
          {t("pages.auth.signUp.hasAccount")} {" "}
          <Link href={localizedAuthPath(locale, "sign-in", returnTo)}>
            {t("pages.auth.signUp.signIn")}
          </Link>
        </p>
      }
    >
      <SignUpForm
        returnTo={returnTo}
        labels={{
          name: t("pages.auth.fields.name"),
          email: t("pages.auth.fields.email"),
          password: t("pages.auth.fields.password"),
          passwordHint: t("pages.auth.fields.passwordHint"),
          confirmPassword: t("pages.auth.fields.confirmPassword"),
          submit: t("pages.auth.signUp.submit"),
          submitting: t("pages.auth.signUp.submitting"),
          validationSummary: t("pages.auth.errors.validationSummary"),
          nameRequired: t("pages.auth.errors.nameRequired"),
          nameLength: t("pages.auth.errors.nameLength"),
          emailRequired: t("pages.auth.errors.emailRequired"),
          emailInvalid: t("pages.auth.errors.emailInvalid"),
          passwordRequired: t("pages.auth.errors.passwordRequired"),
          passwordLength: t("pages.auth.errors.passwordLength"),
          passwordMismatch: t("pages.auth.errors.passwordMismatch"),
          rateLimited: t("pages.auth.errors.rateLimited"),
          genericError: t("pages.auth.errors.signUpFailed"),
        }}
      />
    </AuthShell>
  );
}
