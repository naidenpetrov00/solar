import "server-only";

import { revalidatePath } from "next/cache";

export function revalidatePublicCatalog() {
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[...categoryPath]", "page");
  revalidatePath("/[locale]/products/[productSlug]", "page");
  revalidatePath("/sitemap.xml");
}
