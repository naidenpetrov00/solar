import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { catalogAssetUpload } from "@/db/schema";
import { catalogAssetStorage } from "@/lib/storage";
import { assertCatalogActor, assertIdentifier } from "./management-access";
import { CatalogManagementError } from "./management-errors";

export async function abandonCatalogUpload(actorId: string, uploadId: string) {
  assertIdentifier(uploadId);
  const upload = await db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, actorId, "catalog:manage");
    const [row] = await transaction
      .select()
      .from(catalogAssetUpload)
      .where(
        and(
          eq(catalogAssetUpload.id, uploadId),
          eq(catalogAssetUpload.actorId, actorId),
        ),
      )
      .limit(1)
      .for("update");
    if (!row) throw new CatalogManagementError("NOT_FOUND");
    if (row.state === "attached") throw new CatalogManagementError("INVALID_INPUT");
    await transaction
      .update(catalogAssetUpload)
      .set({ state: "failed", updatedAt: new Date() })
      .where(eq(catalogAssetUpload.id, row.id));
    return row;
  });
  try {
    await catalogAssetStorage.deleteObject(upload.temporaryKey);
    // An inspection/copy can succeed before persisting the promoted state.
    // Every non-attached upload owns an unassociated final key, so deleting it
    // idempotently also compensates for that ambiguous failure window.
    await catalogAssetStorage.deleteObject(upload.finalKey);
    await db
      .delete(catalogAssetUpload)
      .where(eq(catalogAssetUpload.id, upload.id));
  } catch {
    // The failed row is retained for bounded cleanup and the bucket lifecycle rule.
  }
}
