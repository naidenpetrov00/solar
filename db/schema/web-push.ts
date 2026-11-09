import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";
import { userNotification } from "@/db/schema/notifications";

export const webPushSubscription = pgTable(
  "web_push_subscription",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    endpointHash: text("endpoint_hash").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    locale: text("locale").notNull(),
    vapidKeyFingerprint: text("vapid_key_fingerprint").notNull(),
    status: text("status").default("active").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastDeliveredAt: timestamp("last_delivered_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("web_push_subscription_endpoint_hash_idx").on(
      table.endpointHash,
    ),
    index("web_push_subscription_user_status_idx").on(
      table.recipientUserId,
      table.status,
    ),
    check(
      "web_push_subscription_values_check",
      sql`char_length(${table.endpoint}) BETWEEN 12 AND 2048
        AND char_length(${table.endpointHash}) = 64
        AND char_length(${table.p256dh}) BETWEEN 80 AND 120
        AND char_length(${table.auth}) BETWEEN 20 AND 32
        AND ${table.locale} IN ('bg', 'en', 'tr', 'uk')
        AND char_length(${table.vapidKeyFingerprint}) = 64`,
    ),
    check(
      "web_push_subscription_state_check",
      sql`(
        ${table.status} = 'active'
        AND ${table.disabledAt} IS NULL
        AND ${table.expiredAt} IS NULL
      ) OR (
        ${table.status} = 'disabled'
        AND ${table.disabledAt} IS NOT NULL
        AND ${table.expiredAt} IS NULL
      ) OR (
        ${table.status} = 'expired'
        AND ${table.expiredAt} IS NOT NULL
      )`,
    ),
  ],
);

export const webPushDelivery = pgTable(
  "web_push_delivery",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => userNotification.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webPushSubscription.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow(),
    claimToken: uuid("claim_token"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    failureDisposition: text("failure_disposition"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("web_push_delivery_notification_subscription_idx").on(
      table.notificationId,
      table.subscriptionId,
    ),
    index("web_push_delivery_due_idx").on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index("web_push_delivery_stale_claim_idx").on(
      table.status,
      table.claimedAt,
    ),
    check(
      "web_push_delivery_values_check",
      sql`${table.attemptCount} >= 0
        AND (${table.lastErrorCode} IS NULL OR ${table.lastErrorCode} IN (
          'ACCESS_REVOKED', 'OWNERSHIP_MISMATCH', 'SUBSCRIPTION_GONE',
          'VAPID_KEY_STALE', 'PAYLOAD_INVALID', 'PROVIDER_FAILURE'
        ))
        AND (${table.failureDisposition} IS NULL OR ${table.failureDisposition} IN (
          'permanent', 'retry_exhausted', 'cancelled'
        ))`,
    ),
    check(
      "web_push_delivery_state_check",
      sql`(
        ${table.status} = 'pending'
        AND ${table.nextAttemptAt} IS NOT NULL
        AND num_nonnulls(${table.claimToken}, ${table.claimedAt}, ${table.sentAt}, ${table.failedAt}, ${table.failureDisposition}, ${table.lastErrorCode}) = 0
      ) OR (
        ${table.status} = 'processing'
        AND ${table.nextAttemptAt} IS NULL
        AND ${table.claimToken} IS NOT NULL
        AND ${table.claimedAt} IS NOT NULL
        AND ${table.lastAttemptAt} IS NOT NULL
        AND ${table.attemptCount} >= 1
        AND num_nonnulls(${table.sentAt}, ${table.failedAt}, ${table.failureDisposition}, ${table.lastErrorCode}) = 0
      ) OR (
        ${table.status} = 'sent'
        AND ${table.nextAttemptAt} IS NULL
        AND ${table.sentAt} IS NOT NULL
        AND num_nonnulls(${table.claimToken}, ${table.claimedAt}, ${table.failedAt}, ${table.failureDisposition}, ${table.lastErrorCode}) = 0
      ) OR (
        ${table.status} IN ('failed', 'cancelled')
        AND ${table.nextAttemptAt} IS NULL
        AND ${table.failedAt} IS NOT NULL
        AND ${table.failureDisposition} IS NOT NULL
        AND ${table.lastErrorCode} IS NOT NULL
        AND num_nonnulls(${table.claimToken}, ${table.claimedAt}, ${table.sentAt}) = 0
      )`,
    ),
  ],
);
