"use server";

import { AuthorizationError } from "@/lib/permission-policy";
import type {
  BrowserPushActionResult,
  BrowserPushInspection,
  BrowserPushSubscriptionInput,
} from "@/lib/web-push/model";
import {
  disableCurrentBrowserSubscription,
  enableCurrentBrowserSubscription,
  inspectCurrentBrowserSubscription,
  syncCurrentBrowserSubscriptionLocale,
} from "@/lib/web-push/subscriptions";

type InspectionResult =
  | { status: "success"; inspection: BrowserPushInspection }
  | Extract<BrowserPushActionResult, { status: "error" }>;

function actionError(error: unknown): Extract<BrowserPushActionResult, { status: "error" }> {
  if (error instanceof AuthorizationError) return { status: "error", code: "FORBIDDEN" };
  const code = error instanceof Error ? error.message : "";
  if (
    code === "INVALID_INPUT" || code === "NOT_FOUND" ||
    code === "OWNERSHIP_MISMATCH" || code === "NOT_CONFIGURED" ||
    code === "TEMPORARY_FAILURE"
  ) return { status: "error", code };
  return { status: "error", code: "TEMPORARY_FAILURE" };
}

export async function inspectBrowserPushSubscriptionAction(
  endpoint: string,
): Promise<InspectionResult> {
  try {
    return {
      status: "success",
      inspection: await inspectCurrentBrowserSubscription(endpoint),
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function enableBrowserPushSubscriptionAction(input: {
  subscription: BrowserPushSubscriptionInput;
  locale: string;
  previousSubscriptionId?: string;
}): Promise<BrowserPushActionResult> {
  try {
    const subscriptionId = await enableCurrentBrowserSubscription(input);
    return { status: "success", subscriptionId };
  } catch (error) {
    return actionError(error);
  }
}

export async function disableBrowserPushSubscriptionAction(
  subscriptionId: string,
): Promise<BrowserPushActionResult> {
  try {
    await disableCurrentBrowserSubscription(subscriptionId);
    return { status: "success" };
  } catch (error) {
    return actionError(error);
  }
}

export async function syncBrowserPushLocaleAction(
  subscriptionId: string,
  locale: string,
): Promise<BrowserPushActionResult> {
  try {
    await syncCurrentBrowserSubscriptionLocale(subscriptionId, locale);
    return { status: "success" };
  } catch (error) {
    return actionError(error);
  }
}
