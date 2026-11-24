CREATE TABLE "maintenance_service" (
	"code" text PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"one_time_available" boolean DEFAULT false NOT NULL,
	"periodic_available" boolean DEFAULT false NOT NULL,
	"one_time_price_label_bg" text,
	"one_time_price_label_en" text,
	"one_time_price_label_tr" text,
	"one_time_price_label_uk" text,
	"periodic_price_label_bg" text,
	"periodic_price_label_en" text,
	"periodic_price_label_tr" text,
	"periodic_price_label_uk" text,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_service_code_check" CHECK ("maintenance_service"."code" IN ('panel-cleaning', 'grounds-care', 'technical-maintenance')),
	CONSTRAINT "maintenance_service_active_frequency_check" CHECK (NOT "maintenance_service"."is_active" OR "maintenance_service"."one_time_available" OR "maintenance_service"."periodic_available"),
	CONSTRAINT "maintenance_service_one_time_bg_required_check" CHECK (NOT "maintenance_service"."one_time_available" OR "maintenance_service"."one_time_price_label_bg" IS NOT NULL),
	CONSTRAINT "maintenance_service_periodic_bg_required_check" CHECK (NOT "maintenance_service"."periodic_available" OR "maintenance_service"."periodic_price_label_bg" IS NOT NULL),
	CONSTRAINT "maintenance_service_display_order_check" CHECK ("maintenance_service"."display_order" >= 0),
	CONSTRAINT "maintenance_service_one_time_bg_label_check" CHECK ("maintenance_service"."one_time_price_label_bg" IS NULL OR ("maintenance_service"."one_time_price_label_bg" = btrim("maintenance_service"."one_time_price_label_bg") AND char_length("maintenance_service"."one_time_price_label_bg") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_one_time_en_label_check" CHECK ("maintenance_service"."one_time_price_label_en" IS NULL OR ("maintenance_service"."one_time_price_label_en" = btrim("maintenance_service"."one_time_price_label_en") AND char_length("maintenance_service"."one_time_price_label_en") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_one_time_tr_label_check" CHECK ("maintenance_service"."one_time_price_label_tr" IS NULL OR ("maintenance_service"."one_time_price_label_tr" = btrim("maintenance_service"."one_time_price_label_tr") AND char_length("maintenance_service"."one_time_price_label_tr") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_one_time_uk_label_check" CHECK ("maintenance_service"."one_time_price_label_uk" IS NULL OR ("maintenance_service"."one_time_price_label_uk" = btrim("maintenance_service"."one_time_price_label_uk") AND char_length("maintenance_service"."one_time_price_label_uk") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_periodic_bg_label_check" CHECK ("maintenance_service"."periodic_price_label_bg" IS NULL OR ("maintenance_service"."periodic_price_label_bg" = btrim("maintenance_service"."periodic_price_label_bg") AND char_length("maintenance_service"."periodic_price_label_bg") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_periodic_en_label_check" CHECK ("maintenance_service"."periodic_price_label_en" IS NULL OR ("maintenance_service"."periodic_price_label_en" = btrim("maintenance_service"."periodic_price_label_en") AND char_length("maintenance_service"."periodic_price_label_en") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_periodic_tr_label_check" CHECK ("maintenance_service"."periodic_price_label_tr" IS NULL OR ("maintenance_service"."periodic_price_label_tr" = btrim("maintenance_service"."periodic_price_label_tr") AND char_length("maintenance_service"."periodic_price_label_tr") BETWEEN 1 AND 200)),
	CONSTRAINT "maintenance_service_periodic_uk_label_check" CHECK ("maintenance_service"."periodic_price_label_uk" IS NULL OR ("maintenance_service"."periodic_price_label_uk" = btrim("maintenance_service"."periodic_price_label_uk") AND char_length("maintenance_service"."periodic_price_label_uk") BETWEEN 1 AND 200))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_service_display_order_idx" ON "maintenance_service" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "maintenance_service_public_order_idx" ON "maintenance_service" USING btree ("is_active","display_order","code");