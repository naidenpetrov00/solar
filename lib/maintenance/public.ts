import "server-only";

import { db } from "@/db";
import { MaintenanceError } from "@/lib/maintenance/errors";
import {
  isMaintenanceLocale,
  type MaintenanceLocale,
  type MaintenanceServiceCode,
  type PublicMaintenanceService,
} from "@/lib/maintenance/model";
import {
  assertCompleteMaintenanceServiceSet,
  listMaintenanceServiceRows,
} from "@/lib/maintenance/repository";

function priceLabel(
  row: Awaited<ReturnType<typeof listMaintenanceServiceRows>>[number],
  locale: MaintenanceLocale,
  frequency: "oneTime" | "periodic",
) {
  const prefix = frequency === "oneTime" ? "oneTime" : "periodic";
  const suffix = `${locale[0].toUpperCase()}${locale.slice(1)}` as
    | "Bg"
    | "En"
    | "Tr"
    | "Uk";
  const key = `${prefix}PriceLabel${suffix}` as keyof typeof row;
  return row[key] as string | null;
}

export async function listPublicMaintenanceServices(
  requestedLocale: string,
): Promise<PublicMaintenanceService[]> {
  if (!isMaintenanceLocale(requestedLocale)) {
    throw new MaintenanceError("INVALID_INPUT");
  }

  const rows = await listMaintenanceServiceRows(db);
  assertCompleteMaintenanceServiceSet(rows);

  return rows
    .filter(({ isActive }) => isActive)
    .map((row) => ({
      code: row.code as MaintenanceServiceCode,
      oneTime: {
        available: row.oneTimeAvailable,
        priceLabel: row.oneTimeAvailable
          ? priceLabel(row, requestedLocale, "oneTime")
          : null,
      },
      periodic: {
        available: row.periodicAvailable,
        priceLabel: row.periodicAvailable
          ? priceLabel(row, requestedLocale, "periodic")
          : null,
      },
    }));
}
