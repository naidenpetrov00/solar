import "server-only";
import { randomUUID } from "node:crypto";
import {
  catalogProductMedia,
  catalogProductMediaTranslation,
} from "@/db/schema";
import type { CatalogTransaction } from "./actor-repository";
import type { normalizeMedia } from "./management-product-media";
export async function insertProductMedia(
  transaction: CatalogTransaction,
  productId: string,
  media: ReturnType<typeof normalizeMedia>,
) {
  for (const item of media) {
    const mediaId = randomUUID();
    await transaction.insert(catalogProductMedia).values({
      id: mediaId,
      productId,
      reference: item.reference,
      displayOrder: item.displayOrder,
      isPrimary: item.isPrimary,
      isSocialImage: item.isSocialImage,
    });

    if (item.translations.length > 0) {
      await transaction.insert(catalogProductMediaTranslation).values(
        item.translations.map((translation) => ({
          productMediaId: mediaId,
          ...translation,
        })),
      );
    }
  }
}
