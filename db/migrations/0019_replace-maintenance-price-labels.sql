ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_one_time_bg_required_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_periodic_bg_required_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_one_time_bg_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_one_time_en_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_one_time_tr_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_one_time_uk_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_periodic_bg_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_periodic_en_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_periodic_tr_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP CONSTRAINT "maintenance_service_periodic_uk_label_check";--> statement-breakpoint
ALTER TABLE "maintenance_service" ADD COLUMN "one_time_price_cents" bigint;--> statement-breakpoint
ALTER TABLE "maintenance_service" ADD COLUMN "periodic_price_cents" bigint;--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "one_time_price_label_bg";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "one_time_price_label_en";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "one_time_price_label_tr";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "one_time_price_label_uk";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "periodic_price_label_bg";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "periodic_price_label_en";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "periodic_price_label_tr";--> statement-breakpoint
ALTER TABLE "maintenance_service" DROP COLUMN "periodic_price_label_uk";--> statement-breakpoint
ALTER TABLE "maintenance_service" ADD CONSTRAINT "maintenance_service_price_state_check" CHECK ((
        "maintenance_service"."code" = 'technical-maintenance'
        AND "maintenance_service"."one_time_price_cents" IS NULL
        AND "maintenance_service"."periodic_price_cents" IS NULL
      ) OR (
        "maintenance_service"."code" IN ('panel-cleaning', 'grounds-care')
        AND (
          (
            "maintenance_service"."one_time_available"
            AND "maintenance_service"."one_time_price_cents" IS NOT NULL
            AND "maintenance_service"."one_time_price_cents" > 0
          )
          OR (NOT "maintenance_service"."one_time_available" AND "maintenance_service"."one_time_price_cents" IS NULL)
        )
        AND (
          (
            "maintenance_service"."periodic_available"
            AND "maintenance_service"."periodic_price_cents" IS NOT NULL
            AND "maintenance_service"."periodic_price_cents" > 0
          )
          OR (NOT "maintenance_service"."periodic_available" AND "maintenance_service"."periodic_price_cents" IS NULL)
        )
      ));