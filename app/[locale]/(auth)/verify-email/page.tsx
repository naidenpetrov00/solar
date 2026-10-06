import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { AuthState } from "../_components/auth-state";
import {
  getAuthPageMetadata,
  getQueryValue,
  type AuthSearchParams,
} from "../_lib/auth-page";
import { localizedAuthPath } from "../../_lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return getAuthPageMetadata(locale, "verify-email", "auth.verifyEmail");
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AuthSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const { t } = await getT("common", { lng: locale });
  const error = getQueryValue(query.error)?.toLowerCase().replaceAll("_", "-");
  const signInHref = localizedAuthPath(locale, "sign-in");
  const expiredErrors = new Set([
    "token-expired",
    "expired-token",
    "verification-token-expired",
  ]);
  const invalidErrors = new Set([
    "invalid-token",
    "token-invalid",
    "invalid-verification-token",
  ]);

  let state: "prepared" | "expired" | "invalid" | "failure" = "prepared";

  if (error && expiredErrors.has(error)) state = "expired";
  else if (error && invalidErrors.has(error)) state = "invalid";
  else if (error) state = "failure";

  return (
    <AuthShell
      title={t("pages.auth.verifyEmail.title")}
      description={t("pages.auth.verifyEmail.description")}
    >
      <AuthState
        tone={state === "prepared" ? "neutral" : "error"}
        title={t(`pages.auth.verifyEmail.states.${state}.title`)}
        description={t(`pages.auth.verifyEmail.states.${state}.description`)}
        link={{ href: signInHref, label: t("pages.auth.common.backToSignIn") }}
      />
    </AuthShell>
  );
}
