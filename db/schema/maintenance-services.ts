import { sql } from "drizzle-orm";
import {
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
    oneTimePriceLabelBg: text("one_time_price_label_bg"),
    oneTimePriceLabelEn: text("one_time_price_label_en"),
    oneTimePriceLabelTr: text("one_time_price_label_tr"),
    oneTimePriceLabelUk: text("one_time_price_label_uk"),
    periodicPriceLabelBg: text("periodic_price_label_bg"),
    periodicPriceLabelEn: text("periodic_price_label_en"),
    periodicPriceLabelTr: text("periodic_price_label_tr"),
    periodicPriceLabelUk: text("periodic_price_label_uk"),
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
      "maintenance_service_one_time_bg_required_check",
      sql`NOT ${table.oneTimeAvailable} OR ${table.oneTimePriceLabelBg} IS NOT NULL`,
    ),
    check(
      "maintenance_service_periodic_bg_required_check",
      sql`NOT ${table.periodicAvailable} OR ${table.periodicPriceLabelBg} IS NOT NULL`,
    ),
    check(
      "maintenance_service_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
    check(
      "maintenance_service_one_time_bg_label_check",
      sql`${table.oneTimePriceLabelBg} IS NULL OR (${table.oneTimePriceLabelBg} = btrim(${table.oneTimePriceLabelBg}) AND char_length(${table.oneTimePriceLabelBg}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_one_time_en_label_check",
      sql`${table.oneTimePriceLabelEn} IS NULL OR (${table.oneTimePriceLabelEn} = btrim(${table.oneTimePriceLabelEn}) AND char_length(${table.oneTimePriceLabelEn}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_one_time_tr_label_check",
      sql`${table.oneTimePriceLabelTr} IS NULL OR (${table.oneTimePriceLabelTr} = btrim(${table.oneTimePriceLabelTr}) AND char_length(${table.oneTimePriceLabelTr}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_one_time_uk_label_check",
      sql`${table.oneTimePriceLabelUk} IS NULL OR (${table.oneTimePriceLabelUk} = btrim(${table.oneTimePriceLabelUk}) AND char_length(${table.oneTimePriceLabelUk}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_periodic_bg_label_check",
      sql`${table.periodicPriceLabelBg} IS NULL OR (${table.periodicPriceLabelBg} = btrim(${table.periodicPriceLabelBg}) AND char_length(${table.periodicPriceLabelBg}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_periodic_en_label_check",
      sql`${table.periodicPriceLabelEn} IS NULL OR (${table.periodicPriceLabelEn} = btrim(${table.periodicPriceLabelEn}) AND char_length(${table.periodicPriceLabelEn}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_periodic_tr_label_check",
      sql`${table.periodicPriceLabelTr} IS NULL OR (${table.periodicPriceLabelTr} = btrim(${table.periodicPriceLabelTr}) AND char_length(${table.periodicPriceLabelTr}) BETWEEN 1 AND 200)`,
    ),
    check(
      "maintenance_service_periodic_uk_label_check",
      sql`${table.periodicPriceLabelUk} IS NULL OR (${table.periodicPriceLabelUk} = btrim(${table.periodicPriceLabelUk}) AND char_length(${table.periodicPriceLabelUk}) BETWEEN 1 AND 200)`,
    ),
  ],
);
