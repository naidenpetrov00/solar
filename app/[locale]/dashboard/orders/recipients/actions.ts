"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/authorization";
import { isUuid } from "@/lib/catalog/model";
import { OrderNotificationError } from "@/lib/order-notifications/errors";
import {
  createNotificationRecipient,
  updateNotificationRecipient,
} from "@/lib/order-notifications/recipient-management";
import { AuthorizationError } from "@/lib/permission-policy";
import { OrderError } from "@/lib/orders/errors";
import {
  dashboardOrderRecipientsRouteSlug,
  localizedPath,
  supportedLocales,
} from "../../../_lib/routes";
import type {
  RecipientActionCode,
  RecipientActionResult,
} from "./recipient-action-model";

function text(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function errorResult(error: unknown, targetId?: string): RecipientActionResult {
  if (error instanceof AuthorizationError) {
    return { status: "error", code: "FORBIDDEN", targetId };
  }
  if (error instanceof OrderError) {
    const code = error.code === "FORBIDDEN" ? "FORBIDDEN" : "TEMPORARY_FAILURE";
    return { status: "error", code, targetId };
  }
  if (error instanceof OrderNotificationError) {
    const code: RecipientActionCode =
      error.code === "NOT_RETRYABLE" ? "INVALID_INPUT" : error.code;
    const field =
      error.details &&
      typeof error.details === "object" &&
      "field" in error.details &&
      typeof error.details.field === "string"
        ? error.details.field
        : null;
    return {
      status: "error",
      code,
      targetId,
      ...(field ? { fieldErrors: { [field]: "INVALID" as const } } : {}),
    };
  }
  return { status: "error", code: "TEMPORARY_FAILURE", targetId };
}

function revalidate(locale: string) {
  if ((supportedLocales as readonly string[]).includes(locale)) {
    revalidatePath(localizedPath(locale, dashboardOrderRecipientsRouteSlug));
  }
}

export async function createRecipientAction(
  _previous: RecipientActionResult,
  data: FormData,
): Promise<RecipientActionResult> {
  const name = text(data, "name");
  const email = text(data, "email");
  if (!name.trim() || !email.trim()) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      fieldErrors: {
        ...(!name.trim() ? { name: "REQUIRED" as const } : {}),
        ...(!email.trim() ? { email: "REQUIRED" as const } : {}),
      },
    };
  }
  try {
    const actor = await requireUser();
    await createNotificationRecipient({ actorId: actor.id, name, email });
    revalidate(text(data, "locale"));
    return { status: "success", code: "CREATED" };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateRecipientAction(
  _previous: RecipientActionResult,
  data: FormData,
): Promise<RecipientActionResult> {
  const recipientId = text(data, "recipientId");
  const expectedVersion = Number(text(data, "expectedVersion"));
  const intent = text(data, "intent") || text(data, "defaultIntent");
  if (
    !isUuid(recipientId) ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1 ||
    !["save", "activate", "deactivate"].includes(intent)
  ) return { status: "error", code: "INVALID_INPUT", targetId: recipientId };
  try {
    const actor = await requireUser();
    const updated = await updateNotificationRecipient({
      actorId: actor.id,
      recipientId,
      expectedVersion,
      name: text(data, "name"),
      email: text(data, "email"),
      active: intent === "activate" ? true : intent === "deactivate" ? false : text(data, "active") === "true",
    });
    revalidate(text(data, "locale"));
    return {
      status: "success",
      code: intent === "activate" ? "ACTIVATED" : intent === "deactivate" ? "DEACTIVATED" : "UPDATED",
      targetId: recipientId,
      mutationVersion: updated.mutationVersion,
    };
  } catch (error) {
    return errorResult(error, recipientId);
  }
}
