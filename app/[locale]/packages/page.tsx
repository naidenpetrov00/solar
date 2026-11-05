import { permanentRedirect } from "next/navigation";

import { localizedPath } from "../_lib/routes";

export default async function PackagesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(localizedPath(locale, "shop"));
}
