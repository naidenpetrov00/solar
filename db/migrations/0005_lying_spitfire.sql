ALTER TABLE "catalog_product" DROP CONSTRAINT IF EXISTS "catalog_product_internal_name_check";--> statement-breakpoint
ALTER TABLE "catalog_product_translation" DROP CONSTRAINT IF EXISTS "catalog_product_translation_title_check";--> statement-breakpoint
ALTER TABLE "catalog_product_translation" DROP CONSTRAINT IF EXISTS "catalog_product_translation_short_description_check";--> statement-breakpoint
ALTER TABLE "catalog_product_translation" DROP CONSTRAINT IF EXISTS "catalog_product_translation_full_description_check";--> statement-breakpoint
ALTER TABLE "catalog_product" ADD COLUMN IF NOT EXISTS "specification_configuration" jsonb DEFAULT '{"excludedSpecificationIds":[],"customSpecifications":[]}'::jsonb NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_product'
      AND column_name = 'internal_name'
  ) THEN
    INSERT INTO "catalog_product_translation" ("product_id", "locale", "title", "short_description", "full_description")
    SELECT "id", 'bg', "internal_name", '', ''
    FROM "catalog_product"
    ON CONFLICT ("product_id", "locale") DO NOTHING;
  END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "catalog_product" DROP COLUMN IF EXISTS "internal_name";--> statement-breakpoint
ALTER TABLE "catalog_product_translation" ADD CONSTRAINT "catalog_product_translation_title_check" CHECK (char_length(btrim("catalog_product_translation"."title")) <= 200);--> statement-breakpoint
ALTER TABLE "catalog_product_translation" ADD CONSTRAINT "catalog_product_translation_short_description_check" CHECK (char_length(btrim("catalog_product_translation"."short_description")) <= 2000);--> statement-breakpoint
ALTER TABLE "catalog_product_translation" ADD CONSTRAINT "catalog_product_translation_full_description_check" CHECK (char_length(btrim("catalog_product_translation"."full_description")) <= 50000);
