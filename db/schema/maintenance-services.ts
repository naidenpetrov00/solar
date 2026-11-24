import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const maintenanceService = pgTable(
  "maintenance_service",
  {
    code: text("code").primaryKey(),
    isActive: boolean("is_active").default(false).notNull(),
    oneTimeAvailable: boolean("one_time_available").default(false).notNull(),
    periodicAvailable: boolean("periodic_available").default(false).notNull(),
    oneTimePriceCents: bigint("one_time_price_cents", { mode: "bigint" }),
    periodicPriceCents: bigint("periodic_price_cents", { mode: "bigint" }),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("maintenance_service_display_order_idx").on(
      table.displayOrder,
    ),
    index("maintenance_service_public_order_idx").on(
      table.isActive,
      table.displayOrder,
      table.code,
    ),
    check(
      "maintenance_service_code_check",
      sql`${table.code} IN ('panel-cleaning', 'grounds-care', 'technical-maintenance')`,
    ),
    check(
      "maintenance_service_active_frequency_check",
      sql`NOT ${table.isActive} OR ${table.oneTimeAvailable} OR ${table.periodicAvailable}`,
    ),
    check(
      "maintenance_service_price_state_check",
      sql`(
        ${table.code} = 'technical-maintenance'
        AND ${table.oneTimePriceCents} IS NULL
        AND ${table.periodicPriceCents} IS NULL
      ) OR (
        ${table.code} IN ('panel-cleaning', 'grounds-care')
        AND (
          (
            ${table.oneTimeAvailable}
            AND ${table.oneTimePriceCents} IS NOT NULL
            AND ${table.oneTimePriceCents} > 0
          )
          OR (NOT ${table.oneTimeAvailable} AND ${table.oneTimePriceCents} IS NULL)
        )
        AND (
          (
            ${table.periodicAvailable}
            AND ${table.periodicPriceCents} IS NOT NULL
            AND ${table.periodicPriceCents} > 0
          )
          OR (NOT ${table.periodicAvailable} AND ${table.periodicPriceCents} IS NULL)
        )
      )`,
    ),
    check(
      "maintenance_service_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);
