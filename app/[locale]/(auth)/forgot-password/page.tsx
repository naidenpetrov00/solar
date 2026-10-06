import Link from "next/link";

import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { AuthState } from "../_components/auth-state";
import {
  getAuthPageMetadata,
  getSignedOutReturnPath,
  type AuthSearchParams,
} from "../_lib/auth-page";
import { localizedAuthPath } from "../../_lib/routes";

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
      <AuthState
        title={t("pages.auth.forgotPassword.unavailableTitle")}
        description={t("pages.auth.forgotPassword.unavailableDescription")}
      />
    </AuthShell>
  );
}
