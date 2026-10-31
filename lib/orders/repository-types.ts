import type { db } from "@/db";

export type OrderTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type OrderExecutor = typeof db | OrderTransaction;
