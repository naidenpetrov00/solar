import "server-only";

import { db } from "@/db";
import type {
  MaintenanceServiceCode,
  PublicMaintenanceService,
} from "@/lib/maintenance/model";
import {
  assertCompleteMaintenanceServiceSet,
  listMaintenanceServiceRows,
} from "@/lib/maintenance/repository";

export async function listPublicMaintenanceServices(): Promise<
  PublicMaintenanceService[]
> {
  const rows = await listMaintenanceServiceRows(db);
  assertCompleteMaintenanceServiceSet(rows);

  return rows
    .filter(({ isActive }) => isActive)
    .map((row) => ({
      code: row.code as MaintenanceServiceCode,
      oneTime: {
        available: row.oneTimeAvailable,
        amountCents:
          row.oneTimeAvailable && row.oneTimePriceCents !== null
            ? row.oneTimePriceCents.toString()
            : null,
      },
      periodic: {
        available: row.periodicAvailable,
        amountCents:
          row.periodicAvailable && row.periodicPriceCents !== null
            ? row.periodicPriceCents.toString()
            : null,
      },
    }));
}
