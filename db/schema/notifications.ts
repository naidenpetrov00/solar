import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";

export const userNotification = pgTable(
  "user_notification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payloadVersion: integer("payload_version").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    deduplicationKey: text("deduplication_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    unique("user_notification_recipient_deduplication_unique").on(
      table.recipientUserId,
      table.deduplicationKey,
    ),
    index("user_notification_recipient_newest_idx").on(
      table.recipientUserId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("user_notification_recipient_unread_newest_idx")
      .on(
        table.recipientUserId,
        table.createdAt.desc(),
        table.id.desc(),
      )
      .where(sql`${table.readAt} IS NULL`),
    check(
      "user_notification_values_check",
      sql`char_length(${table.kind}) BETWEEN 1 AND 80
        AND ${table.payloadVersion} >= 1
        AND char_length(${table.deduplicationKey}) BETWEEN 1 AND 200`,
    ),
  ],
);

export const userNotificationRelations = relations(
  userNotification,
  ({ one }) => ({
    recipient: one(user, {
      fields: [userNotification.recipientUserId],
      references: [user.id],
    }),
  }),
);
