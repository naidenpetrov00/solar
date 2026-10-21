import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";

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
      <ButtonLink href={localizedPath(locale)}>
        {t("pages.accessDenied.returnHome")}
      </ButtonLink>
    </AuthShell>
  );
}
