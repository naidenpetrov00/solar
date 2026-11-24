import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { maintenanceService, user } from "@/db/schema";
import { MaintenanceError } from "@/lib/maintenance/errors";
import {
  isMaintenanceServiceCode,
  maintenanceServiceCodes,
} from "@/lib/maintenance/model";

export type MaintenanceTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export type MaintenanceExecutor = typeof db | MaintenanceTransaction;
export type MaintenanceServiceRow = typeof maintenanceService.$inferSelect;

export async function getMaintenanceActorRole(
  executor: MaintenanceExecutor,
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

export async function listMaintenanceServiceRows(
  executor: MaintenanceExecutor,
  lock = false,
) {
  const query = executor
    .select()
    .from(maintenanceService)
    .orderBy(asc(maintenanceService.displayOrder), asc(maintenanceService.code));
  return lock ? query.for("update") : query;
}

export function assertCompleteMaintenanceServiceSet(
  rows: MaintenanceServiceRow[],
) {
  const codes = new Set(rows.map(({ code }) => code));
  if (
    rows.length !== maintenanceServiceCodes.length ||
    maintenanceServiceCodes.some((code) => !codes.has(code)) ||
    rows.some(({ code }) => !isMaintenanceServiceCode(code))
  ) {
    throw new MaintenanceError("INCOMPLETE_FIXED_SET");
  }
}
