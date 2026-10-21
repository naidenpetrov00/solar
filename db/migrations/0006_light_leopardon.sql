ALTER TABLE "catalog_product" RENAME COLUMN "slug" TO "bg_slug";--> statement-breakpoint
ALTER TABLE "catalog_product" DROP CONSTRAINT "catalog_product_slug_check";--> statement-breakpoint
DROP INDEX "catalog_product_slug_idx";--> statement-breakpoint
ALTER TABLE "catalog_product" ADD COLUMN "en_slug" text;--> statement-breakpoint
UPDATE "catalog_product" SET "en_slug" = "bg_slug" WHERE "en_slug" IS NULL;--> statement-breakpoint
ALTER TABLE "catalog_product" ALTER COLUMN "en_slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_bg_slug_idx" ON "catalog_product" USING btree ("bg_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_en_slug_idx" ON "catalog_product" USING btree ("en_slug");--> statement-breakpoint
ALTER TABLE "catalog_product" ADD CONSTRAINT "catalog_product_bg_slug_check" CHECK (char_length("catalog_product"."bg_slug") BETWEEN 1 AND 120 AND "catalog_product"."bg_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "catalog_product" ADD CONSTRAINT "catalog_product_en_slug_check" CHECK (char_length("catalog_product"."en_slug") BETWEEN 1 AND 120 AND "catalog_product"."en_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
