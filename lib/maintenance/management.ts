import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { maintenanceService } from "@/db/schema";
import { MaintenanceError } from "@/lib/maintenance/errors";
import {
  maintenanceLocales,
  type MaintenancePriceLabels,
  type MaintenanceServiceCode,
} from "@/lib/maintenance/model";
import {
  assertCompleteMaintenanceServiceSet,
  getMaintenanceActorRole,
  listMaintenanceServiceRows,
} from "@/lib/maintenance/repository";
import { validateMaintenanceServiceInput } from "@/lib/maintenance/validation";
import { hasPermission } from "@/lib/permission-policy";

function assertFresh(actual: Date, expected: string) {
  if (
    !Number.isFinite(Date.parse(expected)) ||
    actual.toISOString() !== expected
  ) {
    throw new MaintenanceError("STALE");
  }
}

function labelsFromRow(
  row: typeof maintenanceService.$inferSelect,
  frequency: "oneTime" | "periodic",
): MaintenancePriceLabels {
  const prefix = frequency === "oneTime" ? "oneTime" : "periodic";
  return Object.fromEntries(
    maintenanceLocales.map((locale) => {
      const suffix = `${locale[0].toUpperCase()}${locale.slice(1)}` as
        | "Bg"
        | "En"
        | "Tr"
        | "Uk";
      const key = `${prefix}PriceLabel${suffix}` as keyof typeof row;
      return [locale, row[key] as string | null];
    }),
  ) as MaintenancePriceLabels;
}

async function assertActor(
  executor: Parameters<typeof getMaintenanceActorRole>[0],
  actorId: string,
  permission: "maintenance:view" | "maintenance:manage",
  lock = false,
) {
  const role = await getMaintenanceActorRole(executor, actorId, lock);
  if (!hasPermission(role, permission)) {
    throw new MaintenanceError("FORBIDDEN");
  }
  return role;
}

export async function getManagedMaintenanceServices(actorId: string) {
  const role = await assertActor(db, actorId, "maintenance:view");
  const rows = await listMaintenanceServiceRows(db);
  assertCompleteMaintenanceServiceSet(rows);

  return {
    canManage: hasPermission(role, "maintenance:manage"),
    services: rows.map((row) => ({
      code: row.code as MaintenanceServiceCode,
      isActive: row.isActive,
      oneTimeAvailable: row.oneTimeAvailable,
      periodicAvailable: row.periodicAvailable,
      oneTimePriceLabels: labelsFromRow(row, "oneTime"),
      periodicPriceLabels: labelsFromRow(row, "periodic"),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function updateMaintenanceService(input: {
  actorId: string;
  expectedUpdatedAt: string;
  code: unknown;
  isActive: boolean;
  oneTimeAvailable: boolean;
  periodicAvailable: boolean;
  oneTimePriceLabels: Record<(typeof maintenanceLocales)[number], string>;
  periodicPriceLabels: Record<(typeof maintenanceLocales)[number], string>;
}) {
  const result = validateMaintenanceServiceInput(input);
  if (!result.success) {
    throw new MaintenanceError("INVALID_INPUT", result.fieldErrors);
  }

  return db.transaction(async (transaction) => {
    await assertActor(transaction, input.actorId, "maintenance:manage", true);
    const rows = await listMaintenanceServiceRows(transaction, true);
    assertCompleteMaintenanceServiceSet(rows);
    const current = rows.find(({ code }) => code === result.data.code);
    if (!current) throw new MaintenanceError("NOT_FOUND");
    assertFresh(current.updatedAt, input.expectedUpdatedAt);

    const updatedAt = new Date();
    const [updated] = await transaction
      .update(maintenanceService)
      .set({
        isActive: result.data.isActive,
        oneTimeAvailable: result.data.oneTimeAvailable,
        periodicAvailable: result.data.periodicAvailable,
        oneTimePriceLabelBg: result.data.oneTimePriceLabels.bg,
        oneTimePriceLabelEn: result.data.oneTimePriceLabels.en,
        oneTimePriceLabelTr: result.data.oneTimePriceLabels.tr,
        oneTimePriceLabelUk: result.data.oneTimePriceLabels.uk,
        periodicPriceLabelBg: result.data.periodicPriceLabels.bg,
        periodicPriceLabelEn: result.data.periodicPriceLabels.en,
        periodicPriceLabelTr: result.data.periodicPriceLabels.tr,
        periodicPriceLabelUk: result.data.periodicPriceLabels.uk,
        updatedAt,
      })
      .where(eq(maintenanceService.code, result.data.code))
      .returning({ updatedAt: maintenanceService.updatedAt });

    return { updatedAt: updated.updatedAt.toISOString() };
  });
}

