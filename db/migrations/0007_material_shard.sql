ALTER TABLE "catalog_product" ADD COLUMN "tr_slug" text;--> statement-breakpoint
ALTER TABLE "catalog_product" ADD COLUMN "uk_slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_tr_effective_slug_idx" ON "catalog_product" USING btree (coalesce("tr_slug", "en_slug"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_uk_effective_slug_idx" ON "catalog_product" USING btree (coalesce("uk_slug", "en_slug"));--> statement-breakpoint
ALTER TABLE "catalog_product" ADD CONSTRAINT "catalog_product_tr_slug_check" CHECK ("catalog_product"."tr_slug" IS NULL OR (char_length("catalog_product"."tr_slug") BETWEEN 1 AND 120 AND "catalog_product"."tr_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'));--> statement-breakpoint
ALTER TABLE "catalog_product" ADD CONSTRAINT "catalog_product_uk_slug_check" CHECK ("catalog_product"."uk_slug" IS NULL OR (char_length("catalog_product"."uk_slug") BETWEEN 1 AND 120 AND "catalog_product"."uk_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'));