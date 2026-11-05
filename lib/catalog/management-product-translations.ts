import "server-only";
import { and, eq, notInArray } from "drizzle-orm";
import { catalogProductTranslation } from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import type { normalizeProductTranslations } from "./management-product-input";
export async function replaceProductTranslations(
  transaction: CatalogTransaction,
  productId: string,
  translations: ReturnType<typeof normalizeProductTranslations>,
) {
  const locales = translations.map(({ locale }) => locale);

  if (locales.length === 0) {
    await transaction
      .delete(catalogProductTranslation)
      .where(eq(catalogProductTranslation.productId, productId));
    return;
  }

  await transaction
    .delete(catalogProductTranslation)
    .where(
      and(
        eq(catalogProductTranslation.productId, productId),
        notInArray(catalogProductTranslation.locale, locales),
      ),
    );

  for (const translation of translations) {
    await transaction
      .insert(catalogProductTranslation)
      .values({ productId, ...translation })
      .onConflictDoUpdate({
        target: [
          catalogProductTranslation.productId,
          catalogProductTranslation.locale,
        ],
        set: {
          title: translation.title,
          shortDescription: translation.shortDescription,
          fullDescription: translation.fullDescription,
          marketingLabel: translation.marketingLabel,
          seoTitle: translation.seoTitle,
          metaDescription: translation.metaDescription,
          updatedAt: new Date(),
        },
      });
  }
}
