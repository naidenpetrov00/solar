ALTER TABLE "catalog_product" ADD COLUMN "assets_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_category" ADD COLUMN "assets_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "catalog_product" SET "assets_updated_at" = "updated_at";--> statement-breakpoint
UPDATE "catalog_category" SET "assets_updated_at" = "updated_at";--> statement-breakpoint
CREATE TABLE "catalog_managed_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"state" text DEFAULT 'ready' NOT NULL,
	"created_by_actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_managed_asset_provider_key_unique" UNIQUE("provider","object_key"),
	CONSTRAINT "catalog_managed_asset_provider_check" CHECK (char_length(btrim("catalog_managed_asset"."provider")) BETWEEN 1 AND 80),
	CONSTRAINT "catalog_managed_asset_key_check" CHECK (char_length(btrim("catalog_managed_asset"."object_key")) BETWEEN 1 AND 1024),
	CONSTRAINT "catalog_managed_asset_filename_check" CHECK (char_length(btrim("catalog_managed_asset"."original_filename")) BETWEEN 1 AND 255),
	CONSTRAINT "catalog_managed_asset_size_check" CHECK ("catalog_managed_asset"."byte_size" BETWEEN 1 AND 20971520),
	CONSTRAINT "catalog_managed_asset_state_check" CHECK ("catalog_managed_asset"."state" IN ('ready', 'delete_pending')),
	CONSTRAINT "catalog_managed_asset_dimensions_check" CHECK (("catalog_managed_asset"."mime_type" IN ('image/jpeg', 'image/png', 'image/webp') AND "catalog_managed_asset"."width" > 0 AND "catalog_managed_asset"."height" > 0) OR ("catalog_managed_asset"."mime_type" = 'application/pdf' AND "catalog_managed_asset"."width" IS NULL AND "catalog_managed_asset"."height" IS NULL))
);--> statement-breakpoint
CREATE TABLE "catalog_asset_upload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"purpose" text NOT NULL,
	"product_id" uuid,
	"category_id" uuid,
	"provider" text NOT NULL,
	"temporary_key" text NOT NULL,
	"final_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"upload_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"authorization_expires_at" timestamp NOT NULL,
	"finalization_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_asset_upload_temporary_key_unique" UNIQUE("provider","temporary_key"),
	CONSTRAINT "catalog_asset_upload_final_key_unique" UNIQUE("provider","final_key"),
	CONSTRAINT "catalog_asset_upload_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade,
	CONSTRAINT "catalog_asset_upload_category_id_catalog_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category"("id") ON DELETE cascade,
	CONSTRAINT "catalog_asset_upload_purpose_check" CHECK ("catalog_asset_upload"."purpose" IN ('product_image', 'product_document', 'category_cover')),
	CONSTRAINT "catalog_asset_upload_target_check" CHECK (("catalog_asset_upload"."purpose" IN ('product_image', 'product_document') AND "catalog_asset_upload"."product_id" IS NOT NULL AND "catalog_asset_upload"."category_id" IS NULL) OR ("catalog_asset_upload"."purpose" = 'category_cover' AND "catalog_asset_upload"."product_id" IS NULL AND "catalog_asset_upload"."category_id" IS NOT NULL)),
	CONSTRAINT "catalog_asset_upload_state_check" CHECK ("catalog_asset_upload"."state" IN ('pending', 'promoted', 'attached', 'failed')),
	CONSTRAINT "catalog_asset_upload_size_check" CHECK ("catalog_asset_upload"."byte_size" BETWEEN 1 AND 20971520)
);--> statement-breakpoint
CREATE TABLE "catalog_product_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_document_asset_unique" UNIQUE("asset_id"),
	CONSTRAINT "catalog_product_document_order_unique" UNIQUE("product_id","display_order"),
	CONSTRAINT "catalog_product_document_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade,
	CONSTRAINT "catalog_product_document_asset_id_catalog_managed_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."catalog_managed_asset"("id") ON DELETE restrict,
	CONSTRAINT "catalog_product_document_order_check" CHECK ("catalog_product_document"."display_order" >= 0)
);--> statement-breakpoint
CREATE TABLE "catalog_product_document_translation" (
	"document_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_document_translation_document_id_locale_pk" PRIMARY KEY("document_id","locale"),
	CONSTRAINT "catalog_product_document_translation_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."catalog_product_document"("id") ON DELETE cascade,
	CONSTRAINT "catalog_product_document_translation_locale_check" CHECK ("catalog_product_document_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_product_document_translation_title_check" CHECK (char_length(btrim("catalog_product_document_translation"."title")) BETWEEN 1 AND 300),
	CONSTRAINT "catalog_product_document_translation_description_check" CHECK ("catalog_product_document_translation"."description" IS NULL OR char_length(btrim("catalog_product_document_translation"."description")) BETWEEN 1 AND 1000)
);--> statement-breakpoint
CREATE TABLE "catalog_category_cover" (
	"category_id" uuid PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_category_cover_asset_unique" UNIQUE("asset_id"),
	CONSTRAINT "catalog_category_cover_category_id_catalog_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category"("id") ON DELETE cascade,
	CONSTRAINT "catalog_category_cover_asset_id_catalog_managed_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."catalog_managed_asset"("id") ON DELETE restrict
);--> statement-breakpoint
CREATE TABLE "catalog_category_cover_translation" (
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"alt_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_category_cover_translation_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "catalog_category_cover_translation_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category_cover"("category_id") ON DELETE cascade,
	CONSTRAINT "catalog_category_cover_translation_locale_check" CHECK ("catalog_category_cover_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_category_cover_translation_alt_check" CHECK (char_length(btrim("catalog_category_cover_translation"."alt_text")) BETWEEN 1 AND 500)
);--> statement-breakpoint
ALTER TABLE "catalog_product_media" ALTER COLUMN "reference" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_product_media" ADD COLUMN "asset_id" uuid;--> statement-breakpoint
ALTER TABLE "catalog_product_media" ADD CONSTRAINT "catalog_product_media_asset_id_catalog_managed_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."catalog_managed_asset"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "catalog_product_media" ADD CONSTRAINT "catalog_product_media_asset_unique" UNIQUE("asset_id");--> statement-breakpoint
ALTER TABLE "catalog_product_media" DROP CONSTRAINT "catalog_product_media_reference_check";--> statement-breakpoint
ALTER TABLE "catalog_product_media" ADD CONSTRAINT "catalog_product_media_reference_check" CHECK ("catalog_product_media"."reference" IS NULL OR char_length(btrim("catalog_product_media"."reference")) BETWEEN 1 AND 2048);--> statement-breakpoint
ALTER TABLE "catalog_product_media" ADD CONSTRAINT "catalog_product_media_source_check" CHECK (("catalog_product_media"."reference" IS NOT NULL) <> ("catalog_product_media"."asset_id" IS NOT NULL));--> statement-breakpoint
CREATE INDEX "catalog_managed_asset_state_idx" ON "catalog_managed_asset" USING btree ("state","updated_at");--> statement-breakpoint
CREATE INDEX "catalog_asset_upload_cleanup_idx" ON "catalog_asset_upload" USING btree ("state","finalization_expires_at");--> statement-breakpoint
CREATE INDEX "catalog_asset_upload_product_idx" ON "catalog_asset_upload" USING btree ("product_id","purpose");--> statement-breakpoint
CREATE INDEX "catalog_asset_upload_category_idx" ON "catalog_asset_upload" USING btree ("category_id","purpose");--> statement-breakpoint
CREATE INDEX "catalog_product_document_product_idx" ON "catalog_product_document" USING btree ("product_id","display_order");
