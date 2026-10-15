import type { Metadata } from "next";
import Link from "next/link";

import { getT } from "@/i18n.server";
import { AuthShell } from "../_components/auth-shell";
import { getPrivatePageMetadata } from "../../_lib/metadata";
import {
  accessDeniedRouteSlug,
  localizedPath,
} from "../../_lib/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPrivatePageMetadata(locale, accessDeniedRouteSlug, "accessDenied");
}

export default async function AccessDeniedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { t } = await getT("common", { lng: locale });

  return (
    <AuthShell
      title={t("pages.accessDenied.title")}
      description={t("pages.accessDenied.description")}
    >
      <Link className="auth-primary-action" href={localizedPath(locale)}>
        {t("pages.accessDenied.returnHome")}
      </Link>
    </AuthShell>
  );
}
