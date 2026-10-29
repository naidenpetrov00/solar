import "server-only";
import { asc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { catalogAssetUpload, catalogManagedAsset } from "@/db/schema";
import { catalogAssetStorage } from "@/lib/storage";

export async function cleanupCatalogAssets(limit = 8) {
  const expired = await db
    .select()
    .from(catalogAssetUpload)
    .where(lte(catalogAssetUpload.finalizationExpiresAt, new Date()))
    .orderBy(asc(catalogAssetUpload.finalizationExpiresAt))
    .limit(limit);
  for (const upload of expired) {
    try {
      await catalogAssetStorage.deleteObject(upload.temporaryKey);
      if (upload.state !== "attached") {
        await catalogAssetStorage.deleteObject(upload.finalKey);
      }
      await db
        .delete(catalogAssetUpload)
        .where(eq(catalogAssetUpload.id, upload.id));
    } catch {
      // Persistent rows are retried by the next bounded cleanup pass.
    }
  }

  const tombstones = await db
    .select()
    .from(catalogManagedAsset)
    .where(eq(catalogManagedAsset.state, "delete_pending"))
    .orderBy(asc(catalogManagedAsset.updatedAt))
    .limit(limit);
  for (const asset of tombstones) {
    try {
      await catalogAssetStorage.deleteObject(asset.objectKey);
      await db
        .delete(catalogManagedAsset)
        .where(eq(catalogManagedAsset.id, asset.id));
    } catch {
      // Persistent tombstones are retried by the next bounded cleanup pass.
    }
  }
}
