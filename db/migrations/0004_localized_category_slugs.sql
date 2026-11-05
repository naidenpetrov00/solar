ALTER TABLE "catalog_category" DROP CONSTRAINT "catalog_category_slug_check";--> statement-breakpoint
DROP INDEX "catalog_category_root_slug_idx";--> statement-breakpoint
DROP INDEX "catalog_category_sibling_slug_idx";--> statement-breakpoint
ALTER TABLE "catalog_category" ADD COLUMN "bg_slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_category" ADD COLUMN "en_slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_category_root_bg_slug_idx" ON "catalog_category" USING btree ("bg_slug") WHERE "catalog_category"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_category_sibling_bg_slug_idx" ON "catalog_category" USING btree ("parent_id","bg_slug") WHERE "catalog_category"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_category_root_en_slug_idx" ON "catalog_category" USING btree ("en_slug") WHERE "catalog_category"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_category_sibling_en_slug_idx" ON "catalog_category" USING btree ("parent_id","en_slug") WHERE "catalog_category"."parent_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_category" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "catalog_category" ADD CONSTRAINT "catalog_category_bg_slug_check" CHECK (char_length("catalog_category"."bg_slug") BETWEEN 1 AND 120 AND "catalog_category"."bg_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "catalog_category" ADD CONSTRAINT "catalog_category_en_slug_check" CHECK (char_length("catalog_category"."en_slug") BETWEEN 1 AND 120 AND "catalog_category"."en_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');