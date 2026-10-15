CREATE TABLE "catalog_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_category_slug_check" CHECK (char_length("catalog_category"."slug") BETWEEN 1 AND 120 AND "catalog_category"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_category_sort_order_check" CHECK ("catalog_category"."sort_order" >= 0),
	CONSTRAINT "catalog_category_status_check" CHECK ("catalog_category"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "catalog_category_self_parent_check" CHECK ("catalog_category"."parent_id" IS NULL OR "catalog_category"."parent_id" <> "catalog_category"."id"),
	CONSTRAINT "catalog_category_publication_timestamp_check" CHECK ("catalog_category"."status" <> 'published' OR "catalog_category"."published_at" IS NOT NULL),
	CONSTRAINT "catalog_category_archival_timestamp_check" CHECK (("catalog_category"."status" = 'archived' AND "catalog_category"."archived_at" IS NOT NULL) OR ("catalog_category"."status" <> 'archived' AND "catalog_category"."archived_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "catalog_category_translation" (
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"introduction" text NOT NULL,
	"detailed_content" text,
	"seo_title" text,
	"meta_description" text,
	"product_title_guidance" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_category_translation_category_id_locale_pk" PRIMARY KEY("category_id","locale"),
	CONSTRAINT "catalog_category_translation_locale_check" CHECK ("catalog_category_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_category_translation_name_check" CHECK (char_length(btrim("catalog_category_translation"."name")) BETWEEN 1 AND 200),
	CONSTRAINT "catalog_category_translation_introduction_check" CHECK (char_length(btrim("catalog_category_translation"."introduction")) BETWEEN 1 AND 2000)
);
--> statement-breakpoint
CREATE TABLE "catalog_product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_number" bigint GENERATED ALWAYS AS IDENTITY (sequence name "catalog_product_sku_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sku" text GENERATED ALWAYS AS ('PRD-' || lpad("sku_number"::text, greatest(6, length("sku_number"::text)), '0')) STORED NOT NULL,
	"internal_name" text NOT NULL,
	"brand" text,
	"slug" text NOT NULL,
	"sales_mode" text NOT NULL,
	"primary_category_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"availability" text,
	"gtin" text,
	"mpn" text,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"vat_rate_basis_points" integer DEFAULT 2000 NOT NULL,
	"price_presentation" text NOT NULL,
	"price_entry_basis" text,
	"price_input_minor" bigint,
	"published_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_id_primary_category_unique" UNIQUE("id","primary_category_id"),
	CONSTRAINT "catalog_product_internal_name_check" CHECK (char_length(btrim("catalog_product"."internal_name")) BETWEEN 1 AND 200),
	CONSTRAINT "catalog_product_brand_check" CHECK ("catalog_product"."brand" IS NULL OR ("catalog_product"."brand" = btrim("catalog_product"."brand") AND char_length("catalog_product"."brand") BETWEEN 1 AND 120)),
	CONSTRAINT "catalog_product_slug_check" CHECK (char_length("catalog_product"."slug") BETWEEN 1 AND 120 AND "catalog_product"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_product_sales_mode_check" CHECK ("catalog_product"."sales_mode" IN ('direct_purchase', 'enquiry')),
	CONSTRAINT "catalog_product_status_check" CHECK ("catalog_product"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "catalog_product_gtin_check" CHECK ("catalog_product"."gtin" IS NULL OR "catalog_product"."gtin" ~ '^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$'),
	CONSTRAINT "catalog_product_mpn_check" CHECK ("catalog_product"."mpn" IS NULL OR ("catalog_product"."mpn" = btrim("catalog_product"."mpn") AND char_length("catalog_product"."mpn") BETWEEN 1 AND 100)),
	CONSTRAINT "catalog_product_currency_check" CHECK ("catalog_product"."currency" = 'EUR'),
	CONSTRAINT "catalog_product_vat_rate_check" CHECK ("catalog_product"."vat_rate_basis_points" = 2000),
	CONSTRAINT "catalog_product_commerce_check" CHECK ((
        "catalog_product"."sales_mode" = 'direct_purchase'
        AND "catalog_product"."availability" IN ('in_stock', 'out_of_stock')
        AND "catalog_product"."price_presentation" = 'exact'
        AND "catalog_product"."price_entry_basis" IN ('vat_inclusive', 'vat_exclusive')
        AND "catalog_product"."price_input_minor" > 0
      ) OR (
        "catalog_product"."sales_mode" = 'enquiry'
        AND "catalog_product"."availability" IS NULL
        AND (
          ("catalog_product"."price_presentation" IN ('exact', 'from')
            AND "catalog_product"."price_entry_basis" IN ('vat_inclusive', 'vat_exclusive')
            AND "catalog_product"."price_input_minor" > 0)
          OR
          ("catalog_product"."price_presentation" = 'on_request'
            AND "catalog_product"."price_entry_basis" IS NULL
            AND "catalog_product"."price_input_minor" IS NULL)
        )
      )),
	CONSTRAINT "catalog_product_publication_timestamp_check" CHECK ("catalog_product"."status" <> 'published' OR "catalog_product"."published_at" IS NOT NULL),
	CONSTRAINT "catalog_product_archival_timestamp_check" CHECK (("catalog_product"."status" = 'archived' AND "catalog_product"."archived_at" IS NOT NULL) OR ("catalog_product"."status" <> 'archived' AND "catalog_product"."archived_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "catalog_product_additional_category" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_additional_category_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_social_image" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_media_product_reference_unique" UNIQUE("product_id","reference"),
	CONSTRAINT "catalog_product_media_product_order_unique" UNIQUE("product_id","display_order"),
	CONSTRAINT "catalog_product_media_reference_check" CHECK (char_length(btrim("catalog_product_media"."reference")) BETWEEN 1 AND 2048),
	CONSTRAINT "catalog_product_media_display_order_check" CHECK ("catalog_product_media"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_product_media_translation" (
	"product_media_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"alt_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_media_translation_product_media_id_locale_pk" PRIMARY KEY("product_media_id","locale"),
	CONSTRAINT "catalog_product_media_translation_locale_check" CHECK ("catalog_product_media_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_product_media_translation_alt_text_check" CHECK (char_length(btrim("catalog_product_media_translation"."alt_text")) BETWEEN 1 AND 500)
);
--> statement-breakpoint
CREATE TABLE "catalog_product_specification_value" (
	"product_id" uuid NOT NULL,
	"primary_category_id" uuid NOT NULL,
	"specification_id" uuid NOT NULL,
	"text_value" text,
	"number_value" numeric(20, 6),
	"boolean_value" boolean,
	"selection_option_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_specification_value_product_id_specification_id_pk" PRIMARY KEY("product_id","specification_id"),
	CONSTRAINT "catalog_product_specification_value_single_value_check" CHECK (num_nonnulls("catalog_product_specification_value"."text_value", "catalog_product_specification_value"."number_value", "catalog_product_specification_value"."boolean_value", "catalog_product_specification_value"."selection_option_id") = 1),
	CONSTRAINT "catalog_product_specification_value_text_check" CHECK ("catalog_product_specification_value"."text_value" IS NULL OR char_length(btrim("catalog_product_specification_value"."text_value")) BETWEEN 1 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "catalog_product_translation" (
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"full_description" text NOT NULL,
	"marketing_label" text,
	"seo_title" text,
	"meta_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_product_translation_product_id_locale_pk" PRIMARY KEY("product_id","locale"),
	CONSTRAINT "catalog_product_translation_locale_check" CHECK ("catalog_product_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_product_translation_title_check" CHECK (char_length(btrim("catalog_product_translation"."title")) BETWEEN 1 AND 200),
	CONSTRAINT "catalog_product_translation_short_description_check" CHECK (char_length(btrim("catalog_product_translation"."short_description")) BETWEEN 1 AND 2000),
	CONSTRAINT "catalog_product_translation_full_description_check" CHECK (char_length(btrim("catalog_product_translation"."full_description")) BETWEEN 1 AND 50000)
);
--> statement-breakpoint
CREATE TABLE "catalog_specification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value_type" text NOT NULL,
	"unit" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_specification_category_key_unique" UNIQUE("category_id","key"),
	CONSTRAINT "catalog_specification_id_category_unique" UNIQUE("id","category_id"),
	CONSTRAINT "catalog_specification_key_check" CHECK (char_length("catalog_specification"."key") BETWEEN 1 AND 80 AND "catalog_specification"."key" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_specification_value_type_check" CHECK ("catalog_specification"."value_type" IN ('text', 'number', 'boolean', 'selection')),
	CONSTRAINT "catalog_specification_unit_check" CHECK ("catalog_specification"."unit" IS NULL OR char_length(btrim("catalog_specification"."unit")) BETWEEN 1 AND 40),
	CONSTRAINT "catalog_specification_display_order_check" CHECK ("catalog_specification"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_specification_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"specification_id" uuid NOT NULL,
	"code" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_specification_option_specification_code_unique" UNIQUE("specification_id","code"),
	CONSTRAINT "catalog_specification_option_id_specification_unique" UNIQUE("id","specification_id"),
	CONSTRAINT "catalog_specification_option_code_check" CHECK (char_length("catalog_specification_option"."code") BETWEEN 1 AND 80 AND "catalog_specification_option"."code" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_specification_option_display_order_check" CHECK ("catalog_specification_option"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_specification_option_translation" (
	"option_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_specification_option_translation_option_id_locale_pk" PRIMARY KEY("option_id","locale"),
	CONSTRAINT "catalog_specification_option_translation_locale_check" CHECK ("catalog_specification_option_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_specification_option_translation_label_check" CHECK (char_length(btrim("catalog_specification_option_translation"."label")) BETWEEN 1 AND 200)
);
--> statement-breakpoint
CREATE TABLE "catalog_specification_translation" (
	"specification_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_specification_translation_specification_id_locale_pk" PRIMARY KEY("specification_id","locale"),
	CONSTRAINT "catalog_specification_translation_locale_check" CHECK ("catalog_specification_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_specification_translation_label_check" CHECK (char_length(btrim("catalog_specification_translation"."label")) BETWEEN 1 AND 200)
);
--> statement-breakpoint
ALTER TABLE "catalog_category" ADD CONSTRAINT "catalog_category_parent_id_catalog_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_category_translation" ADD CONSTRAINT "catalog_category_translation_category_id_catalog_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product" ADD CONSTRAINT "catalog_product_primary_category_id_catalog_category_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."catalog_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_additional_category" ADD CONSTRAINT "catalog_product_additional_category_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_additional_category" ADD CONSTRAINT "catalog_product_additional_category_category_id_catalog_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_media" ADD CONSTRAINT "catalog_product_media_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_media_translation" ADD CONSTRAINT "catalog_product_media_translation_product_media_id_catalog_product_media_id_fk" FOREIGN KEY ("product_media_id") REFERENCES "public"."catalog_product_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_specification_value" ADD CONSTRAINT "catalog_product_specification_value_product_category_fk" FOREIGN KEY ("product_id","primary_category_id") REFERENCES "public"."catalog_product"("id","primary_category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_specification_value" ADD CONSTRAINT "catalog_product_specification_value_specification_category_fk" FOREIGN KEY ("specification_id","primary_category_id") REFERENCES "public"."catalog_specification"("id","category_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_specification_value" ADD CONSTRAINT "catalog_product_specification_value_option_specification_fk" FOREIGN KEY ("selection_option_id","specification_id") REFERENCES "public"."catalog_specification_option"("id","specification_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_translation" ADD CONSTRAINT "catalog_product_translation_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification" ADD CONSTRAINT "catalog_specification_category_id_catalog_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_option" ADD CONSTRAINT "catalog_specification_option_specification_id_catalog_specification_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."catalog_specification"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_option_translation" ADD CONSTRAINT "catalog_specification_option_translation_option_id_catalog_specification_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."catalog_specification_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_translation" ADD CONSTRAINT "catalog_specification_translation_specification_id_catalog_specification_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."catalog_specification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_category_root_slug_idx" ON "catalog_category" USING btree ("slug") WHERE "catalog_category"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_category_sibling_slug_idx" ON "catalog_category" USING btree ("parent_id","slug") WHERE "catalog_category"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_category_parent_order_idx" ON "catalog_category" USING btree ("parent_id","sort_order","id");--> statement-breakpoint
CREATE INDEX "catalog_category_status_parent_idx" ON "catalog_category" USING btree ("status","parent_id","sort_order");--> statement-breakpoint
CREATE INDEX "catalog_category_translation_locale_name_idx" ON "catalog_category_translation" USING btree ("locale","name","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_sku_idx" ON "catalog_product" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_slug_idx" ON "catalog_product" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_gtin_idx" ON "catalog_product" USING btree ("gtin") WHERE "catalog_product"."gtin" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_product_status_category_idx" ON "catalog_product" USING btree ("status","primary_category_id","id");--> statement-breakpoint
CREATE INDEX "catalog_product_primary_category_idx" ON "catalog_product" USING btree ("primary_category_id","id");--> statement-breakpoint
CREATE INDEX "catalog_product_additional_category_category_idx" ON "catalog_product_additional_category" USING btree ("category_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_media_primary_idx" ON "catalog_product_media" USING btree ("product_id") WHERE "catalog_product_media"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_media_social_idx" ON "catalog_product_media" USING btree ("product_id") WHERE "catalog_product_media"."is_social_image" = true;--> statement-breakpoint
CREATE INDEX "catalog_product_media_order_idx" ON "catalog_product_media" USING btree ("product_id","display_order","id");--> statement-breakpoint
CREATE INDEX "catalog_product_specification_value_specification_idx" ON "catalog_product_specification_value" USING btree ("specification_id","product_id");--> statement-breakpoint
CREATE INDEX "catalog_specification_category_order_idx" ON "catalog_specification" USING btree ("category_id","display_order","id");--> statement-breakpoint
CREATE INDEX "catalog_specification_option_order_idx" ON "catalog_specification_option" USING btree ("specification_id","display_order","id");
