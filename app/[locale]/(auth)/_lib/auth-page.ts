import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authorization";
import { getPageMetadata } from "../../_lib/metadata";
import {
  safeInternalReturnPath,
  type AuthRouteSlug,
} from "../../_lib/routes";

export type AuthSearchParams = Record<string, string | string[] | undefined>;

export function getQueryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export async function getSignedOutReturnPath(
  locale: string,
  value: string | string[] | undefined,
) {
  const returnTo = safeInternalReturnPath(value, locale);

  if (await getCurrentUser()) {
    redirect(returnTo);
  }

  return returnTo;
}

export async function getAuthPageMetadata(
  locale: string,
  slug: AuthRouteSlug,
  pageKey: string,
): Promise<Metadata> {
  return {
    ...(await getPageMetadata(
      locale,
      slug,
      pageKey,
      `pages.${pageKey}.description`,
    )),
    robots: {
      index: false,
      follow: true,
    },
  };
}
