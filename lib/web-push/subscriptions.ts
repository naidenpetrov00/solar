import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { webPushSubscription } from "@/db/schema";
import { isUuid } from "@/lib/catalog/model";
import { getWebPushEnvironment, webPushEndpointHash } from "@/lib/web-push/config";
import { requireCurrentPushUser } from "@/lib/web-push/current-user";
import type {
  BrowserPushInspection,
  BrowserPushSubscriptionInput,
} from "@/lib/web-push/model";
import {
  isSupportedPushLocale,
  normalizePushEndpoint,
  validateBrowserPushInput,
} from "@/lib/web-push/validation";

export async function inspectCurrentBrowserSubscription(
  rawEndpoint: string,
): Promise<BrowserPushInspection> {
  const currentUser = await requireCurrentPushUser();
  const endpoint = normalizePushEndpoint(rawEndpoint);
  const [stored] = await db
    .select()
    .from(webPushSubscription)
    .where(eq(webPushSubscription.endpointHash, webPushEndpointHash(endpoint)))
    .limit(1);
  if (!stored) return { state: "unknown" };
  if (stored.recipientUserId !== currentUser.id) {
    return { state: "ownership_mismatch" };
  }
  if (stored.status === "expired") {
    return { state: "expired", subscriptionId: stored.id };
  }
  const environment = getWebPushEnvironment();
  if (!environment || stored.vapidKeyFingerprint !== environment.keyFingerprint) {
    return { state: "stale_vapid", subscriptionId: stored.id };
  }
  return {
    state: stored.status === "active" ? "owned_active" : "owned_disabled",
    subscriptionId: stored.id,
  };
}

export async function enableCurrentBrowserSubscription(input: {
  subscription: BrowserPushSubscriptionInput;
  locale: string;
  previousSubscriptionId?: string;
}) {
  const currentUser = await requireCurrentPushUser();
  if (!isSupportedPushLocale(input.locale)) throw new Error("INVALID_INPUT");
  if (input.previousSubscriptionId && !isUuid(input.previousSubscriptionId)) {
    throw new Error("INVALID_INPUT");
  }
  const environment = getWebPushEnvironment();
  if (!environment) throw new Error("NOT_CONFIGURED");
  const subscription = await validateBrowserPushInput(input.subscription);
  const endpointHash = webPushEndpointHash(subscription.endpoint);
  return db.transaction(async (transaction) => {
    const [inserted] = await transaction
      .insert(webPushSubscription)
      .values({
        recipientUserId: currentUser.id,
        ...subscription,
        endpointHash,
        locale: input.locale,
        vapidKeyFingerprint: environment.keyFingerprint,
      })
      .onConflictDoNothing({ target: webPushSubscription.endpointHash })
      .returning({ id: webPushSubscription.id });
    let subscriptionId = inserted?.id;
    if (!subscriptionId) {
      const [existing] = await transaction
        .select()
        .from(webPushSubscription)
        .where(eq(webPushSubscription.endpointHash, endpointHash))
        .limit(1)
        .for("update");
      if (!existing || existing.recipientUserId !== currentUser.id) {
        throw new Error("OWNERSHIP_MISMATCH");
      }
      const [updated] = await transaction
        .update(webPushSubscription)
        .set({
          ...subscription,
          locale: input.locale,
          vapidKeyFingerprint: environment.keyFingerprint,
          status: "active",
          lastSeenAt: new Date(),
          disabledAt: null,
          expiredAt: null,
        })
        .where(eq(webPushSubscription.id, existing.id))
        .returning({ id: webPushSubscription.id });
      if (!updated) throw new Error("TEMPORARY_FAILURE");
      subscriptionId = updated.id;
    }
    if (
      input.previousSubscriptionId &&
      input.previousSubscriptionId !== subscriptionId
    ) {
      await transaction
        .update(webPushSubscription)
        .set({ status: "expired", expiredAt: new Date() })
        .where(
          and(
            eq(webPushSubscription.id, input.previousSubscriptionId),
            eq(webPushSubscription.recipientUserId, currentUser.id),
          ),
        );
    }
    if (!subscriptionId) throw new Error("TEMPORARY_FAILURE");
    return subscriptionId;
  });
}

export async function disableCurrentBrowserSubscription(subscriptionId: string) {
  if (!isUuid(subscriptionId)) throw new Error("INVALID_INPUT");
  const currentUser = await requireCurrentPushUser({ allowWithoutPermission: true });
  const rows = await db
    .update(webPushSubscription)
    .set({ status: "disabled", disabledAt: new Date(), expiredAt: null })
    .where(
      and(
        eq(webPushSubscription.id, subscriptionId),
        eq(webPushSubscription.recipientUserId, currentUser.id),
      ),
    )
    .returning({ id: webPushSubscription.id });
  if (!rows.length) throw new Error("NOT_FOUND");
}

export async function syncCurrentBrowserSubscriptionLocale(
  subscriptionId: string,
  locale: string,
) {
  if (!isUuid(subscriptionId) || !isSupportedPushLocale(locale)) {
    throw new Error("INVALID_INPUT");
  }
  const currentUser = await requireCurrentPushUser();
  await db
    .update(webPushSubscription)
    .set({ locale, lastSeenAt: new Date() })
    .where(
      and(
        eq(webPushSubscription.id, subscriptionId),
        eq(webPushSubscription.recipientUserId, currentUser.id),
        eq(webPushSubscription.status, "active"),
      ),
    );
}
