"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/authorization";
import { MaintenanceError } from "@/lib/maintenance/errors";
import { maintenanceLocales } from "@/lib/maintenance/model";
import { updateMaintenanceService } from "@/lib/maintenance/management";
import { validateMaintenanceServiceInput } from "@/lib/maintenance/validation";
import { AuthorizationError, hasPermission } from "@/lib/permission-policy";
import {
  dashboardMaintenanceRouteSlug,
  localizedPath,
  supportedLocales,
  type SupportedLocale,
} from "../../../_lib/routes";
import type { MaintenanceActionResult } from "./action-model";

function stringValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function booleanValue(data: FormData, key: string) {
  return stringValue(data, key) === "true";
}

function actionLocale(data: FormData) {
  const locale = stringValue(data, "locale");
  return supportedLocales.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : null;
}

function revalidateMaintenanceDashboard() {
  for (const locale of supportedLocales) {
    revalidatePath(localizedPath(locale, dashboardMaintenanceRouteSlug));
  }
}

function actionError(error: unknown): MaintenanceActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN" };
  }
  if (error instanceof MaintenanceError) {
    return {
      status: "error",
      code: error.code,
      fieldErrors:
        error.code === "INVALID_INPUT" &&
        typeof error.details === "object" &&
        error.details !== null
          ? (error.details as MaintenanceActionResult["fieldErrors"])
          : undefined,
    };
  }
  throw error;
}

async function requireMaintenanceManager() {
  const actor = await requireUser();
  if (!hasPermission(actor.role, "maintenance:manage")) {
    throw new AuthorizationError("PERMISSION_DENIED", 403);
  }
  return actor;
}

export async function saveMaintenanceServiceAction(
  _previous: MaintenanceActionResult,
  data: FormData,
): Promise<MaintenanceActionResult> {
  const locale = actionLocale(data);
  const expectedUpdatedAt = stringValue(data, "expectedUpdatedAt");
  const input = {
    code: stringValue(data, "code"),
    isActive: booleanValue(data, "isActive"),
    oneTimeAvailable: booleanValue(data, "oneTimeAvailable"),
    periodicAvailable: booleanValue(data, "periodicAvailable"),
    oneTimePriceLabels: Object.fromEntries(
      maintenanceLocales.map((candidate) => [
        candidate,
        stringValue(data, `oneTimePriceLabels.${candidate}`),
      ]),
    ) as Record<(typeof maintenanceLocales)[number], string>,
    periodicPriceLabels: Object.fromEntries(
      maintenanceLocales.map((candidate) => [
        candidate,
        stringValue(data, `periodicPriceLabels.${candidate}`),
      ]),
    ) as Record<(typeof maintenanceLocales)[number], string>,
  };
  const validation = validateMaintenanceServiceInput(input);

  if (
    !locale ||
    !Number.isFinite(Date.parse(expectedUpdatedAt)) ||
    !validation.success
  ) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      fieldErrors: validation.success ? undefined : validation.fieldErrors,
    };
  }

  try {
    const actor = await requireMaintenanceManager();
    const saved = await updateMaintenanceService({
      actorId: actor.id,
      expectedUpdatedAt,
      ...input,
    });
    revalidateMaintenanceDashboard();
    return { status: "success", code: "SAVED", ...saved };
  } catch (error) {
    return actionError(error);
  }
}

