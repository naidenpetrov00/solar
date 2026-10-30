CREATE TABLE "catalog_promotion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_name" text NOT NULL,
	"discount_type" text NOT NULL,
	"scope" text NOT NULL,
	"percentage_basis_points" integer,
	"fixed_vat_inclusive_minor" bigint,
	"is_active" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_promotion_internal_name_check" CHECK ("catalog_promotion"."internal_name" = btrim("catalog_promotion"."internal_name") AND char_length("catalog_promotion"."internal_name") BETWEEN 1 AND 200),
	CONSTRAINT "catalog_promotion_discount_type_check" CHECK ("catalog_promotion"."discount_type" IN ('percentage', 'fixed_eur')),
	CONSTRAINT "catalog_promotion_scope_check" CHECK ("catalog_promotion"."scope" IN ('catalog', 'category', 'product')),
	CONSTRAINT "catalog_promotion_value_check" CHECK ((
        "catalog_promotion"."discount_type" = 'percentage'
        AND "catalog_promotion"."percentage_basis_points" BETWEEN 1 AND 9999
        AND "catalog_promotion"."fixed_vat_inclusive_minor" IS NULL
      ) OR (
        "catalog_promotion"."discount_type" = 'fixed_eur'
        AND "catalog_promotion"."percentage_basis_points" IS NULL
        AND "catalog_promotion"."fixed_vat_inclusive_minor" > 0
      )),
	CONSTRAINT "catalog_promotion_schedule_check" CHECK ("catalog_promotion"."starts_at" IS NULL OR "catalog_promotion"."ends_at" IS NULL OR "catalog_promotion"."ends_at" > "catalog_promotion"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_promotion_category" (
	"promotion_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_promotion_category_promotion_id_category_id_pk" PRIMARY KEY("promotion_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_promotion_product" (
	"promotion_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_promotion_product_promotion_id_product_id_pk" PRIMARY KEY("promotion_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_promotion_translation" (
	"promotion_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"public_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_promotion_translation_promotion_id_locale_pk" PRIMARY KEY("promotion_id","locale"),
	CONSTRAINT "catalog_promotion_translation_locale_check" CHECK ("catalog_promotion_translation"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "catalog_promotion_translation_public_label_check" CHECK ("catalog_promotion_translation"."public_label" IS NULL OR ("catalog_promotion_translation"."public_label" = btrim("catalog_promotion_translation"."public_label") AND char_length("catalog_promotion_translation"."public_label") BETWEEN 1 AND 200))
);
--> statement-breakpoint
ALTER TABLE "catalog_promotion_category" ADD CONSTRAINT "catalog_promotion_category_promotion_id_catalog_promotion_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."catalog_promotion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_promotion_category" ADD CONSTRAINT "catalog_promotion_category_category_id_catalog_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_promotion_product" ADD CONSTRAINT "catalog_promotion_product_promotion_id_catalog_promotion_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."catalog_promotion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_promotion_product" ADD CONSTRAINT "catalog_promotion_product_product_id_catalog_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_promotion_translation" ADD CONSTRAINT "catalog_promotion_translation_promotion_id_catalog_promotion_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."catalog_promotion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_promotion_activity_idx" ON "catalog_promotion" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "catalog_promotion_category_category_idx" ON "catalog_promotion_category" USING btree ("category_id","promotion_id");--> statement-breakpoint
CREATE INDEX "catalog_promotion_product_product_idx" ON "catalog_promotion_product" USING btree ("product_id","promotion_id");