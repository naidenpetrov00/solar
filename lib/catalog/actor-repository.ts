import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";

export type CatalogTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export type CatalogExecutor = typeof db | CatalogTransaction;

export async function getCatalogActorRole(
  executor: CatalogExecutor,
  actorId: string,
  lock = false,
) {
  const query = executor
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  const rows = lock ? await query.for("update") : await query;
  return rows[0]?.role ?? null;
}
