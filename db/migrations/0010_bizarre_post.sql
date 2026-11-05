CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number_sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "sales_order_order_number_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_number" text GENERATED ALWAYS AS ('ORD-' || lpad("order_number_sequence"::text, greatest(6, length("order_number_sequence"::text)), '0')) STORED NOT NULL,
	"submission_key" uuid NOT NULL,
	"submission_fingerprint" text NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"current_revision_number" integer DEFAULT 1 NOT NULL,
	"mutation_version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"payment_status_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_submission_fingerprint_check" CHECK ("sales_order"."submission_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sales_order_status_check" CHECK ("sales_order"."status" IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed')),
	CONSTRAINT "sales_order_payment_status_check" CHECK ("sales_order"."payment_status" IN ('unpaid', 'partially_paid', 'paid', 'failed', 'partially_refunded', 'refunded')),
	CONSTRAINT "sales_order_version_check" CHECK ("sales_order"."current_revision_number" >= 1 AND "sales_order"."mutation_version" >= "sales_order"."current_revision_number"),
	CONSTRAINT "sales_order_lifecycle_timestamps_check" CHECK ((
        "sales_order"."status" = 'pending_approval'
        AND num_nonnulls("sales_order"."approved_at", "sales_order"."rejected_at", "sales_order"."cancelled_at", "sales_order"."completed_at") = 0
      ) OR (
        "sales_order"."status" = 'approved'
        AND "sales_order"."approved_at" IS NOT NULL
        AND num_nonnulls("sales_order"."rejected_at", "sales_order"."cancelled_at", "sales_order"."completed_at") = 0
      ) OR (
        "sales_order"."status" = 'rejected'
        AND "sales_order"."rejected_at" IS NOT NULL
        AND num_nonnulls("sales_order"."approved_at", "sales_order"."cancelled_at", "sales_order"."completed_at") = 0
      ) OR (
        "sales_order"."status" = 'cancelled'
        AND "sales_order"."cancelled_at" IS NOT NULL
        AND num_nonnulls("sales_order"."rejected_at", "sales_order"."completed_at") = 0
      ) OR (
        "sales_order"."status" = 'completed'
        AND "sales_order"."approved_at" IS NOT NULL
        AND "sales_order"."completed_at" IS NOT NULL
        AND num_nonnulls("sales_order"."rejected_at", "sales_order"."cancelled_at") = 0
      )),
	CONSTRAINT "sales_order_payment_timestamps_check" CHECK (("sales_order"."payment_status" <> 'paid' OR "sales_order"."paid_at" IS NOT NULL)
        AND ("sales_order"."payment_status" <> 'refunded' OR "sales_order"."refunded_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "sales_order_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"revision_kind" text NOT NULL,
	"locale" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_phone_normalized" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_email_normalized" text NOT NULL,
	"city" text NOT NULL,
	"city_normalized" text NOT NULL,
	"delivery_address" text NOT NULL,
	"customer_note" text,
	"payment_method" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"catalog_subtotal_gross_minor" bigint NOT NULL,
	"promotion_discount_gross_minor" bigint NOT NULL,
	"item_adjustment_gross_minor" bigint NOT NULL,
	"items_net_minor" bigint NOT NULL,
	"items_vat_minor" bigint NOT NULL,
	"items_gross_minor" bigint NOT NULL,
	"order_adjustment_net_minor" bigint NOT NULL,
	"order_adjustment_vat_minor" bigint NOT NULL,
	"order_adjustment_gross_minor" bigint NOT NULL,
	"total_net_minor" bigint NOT NULL,
	"total_vat_minor" bigint NOT NULL,
	"total_gross_minor" bigint NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_revision_order_number_unique" UNIQUE("order_id","revision_number"),
	CONSTRAINT "sales_order_revision_identity_check" CHECK ("sales_order_revision"."revision_number" >= 1
        AND (("sales_order_revision"."revision_number" = 1 AND "sales_order_revision"."revision_kind" = 'customer_submission')
          OR ("sales_order_revision"."revision_number" > 1 AND "sales_order_revision"."revision_kind" = 'administrator_edit'))),
	CONSTRAINT "sales_order_revision_locale_check" CHECK ("sales_order_revision"."locale" IN ('bg', 'en', 'tr', 'uk')),
	CONSTRAINT "sales_order_revision_contact_check" CHECK (char_length("sales_order_revision"."customer_name") BETWEEN 2 AND 100
        AND char_length("sales_order_revision"."customer_phone") BETWEEN 7 AND 32
        AND char_length("sales_order_revision"."customer_phone_normalized") BETWEEN 7 AND 21
        AND char_length("sales_order_revision"."customer_email") BETWEEN 3 AND 320
        AND char_length("sales_order_revision"."customer_email_normalized") BETWEEN 3 AND 320
        AND char_length("sales_order_revision"."city") BETWEEN 2 AND 120
        AND char_length("sales_order_revision"."city_normalized") BETWEEN 2 AND 120
        AND char_length("sales_order_revision"."delivery_address") BETWEEN 5 AND 500
        AND ("sales_order_revision"."customer_note" IS NULL OR char_length("sales_order_revision"."customer_note") BETWEEN 1 AND 2000)),
	CONSTRAINT "sales_order_revision_payment_method_check" CHECK ("sales_order_revision"."payment_method" IN ('cash_on_delivery', 'bank_transfer', 'arranged_by_phone')),
	CONSTRAINT "sales_order_revision_currency_check" CHECK ("sales_order_revision"."currency" = 'EUR'),
	CONSTRAINT "sales_order_revision_calculation_version_check" CHECK ("sales_order_revision"."calculation_version" = 1),
	CONSTRAINT "sales_order_revision_totals_check" CHECK ("sales_order_revision"."catalog_subtotal_gross_minor" > 0
        AND "sales_order_revision"."promotion_discount_gross_minor" >= 0
        AND "sales_order_revision"."items_net_minor" > 0
        AND "sales_order_revision"."items_vat_minor" >= 0
        AND "sales_order_revision"."items_gross_minor" > 0
        AND "sales_order_revision"."total_net_minor" > 0
        AND "sales_order_revision"."total_vat_minor" >= 0
        AND "sales_order_revision"."total_gross_minor" > 0
        AND "sales_order_revision"."items_net_minor" + "sales_order_revision"."items_vat_minor" = "sales_order_revision"."items_gross_minor"
        AND "sales_order_revision"."catalog_subtotal_gross_minor" - "sales_order_revision"."promotion_discount_gross_minor" + "sales_order_revision"."item_adjustment_gross_minor" = "sales_order_revision"."items_gross_minor"
        AND "sales_order_revision"."order_adjustment_net_minor" + "sales_order_revision"."order_adjustment_vat_minor" = "sales_order_revision"."order_adjustment_gross_minor"
        AND "sales_order_revision"."items_net_minor" + "sales_order_revision"."order_adjustment_net_minor" = "sales_order_revision"."total_net_minor"
        AND "sales_order_revision"."items_vat_minor" + "sales_order_revision"."order_adjustment_vat_minor" = "sales_order_revision"."total_vat_minor"
        AND "sales_order_revision"."items_gross_minor" + "sales_order_revision"."order_adjustment_gross_minor" = "sales_order_revision"."total_gross_minor")
);
--> statement-breakpoint
CREATE TABLE "sales_order_item_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"line_key" uuid NOT NULL,
	"position" integer NOT NULL,
	"source_product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"localized_title" text NOT NULL,
	"title_locale" text NOT NULL,
	"quantity" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"vat_rate_basis_points" integer NOT NULL,
	"catalog_unit_net_minor" bigint NOT NULL,
	"catalog_unit_gross_minor" bigint NOT NULL,
	"source_promotion_id" uuid,
	"promotion_internal_name" text,
	"promotion_public_label" text,
	"promotion_discount_type" text,
	"promotion_percentage_basis_points" integer,
	"promotion_fixed_gross_minor" bigint,
	"promotion_unit_discount_gross_minor" bigint NOT NULL,
	"effective_catalog_unit_net_minor" bigint NOT NULL,
	"effective_catalog_unit_gross_minor" bigint NOT NULL,
	"manual_unit_adjustment_gross_minor" bigint NOT NULL,
	"final_unit_net_minor" bigint NOT NULL,
	"final_unit_vat_minor" bigint NOT NULL,
	"final_unit_gross_minor" bigint NOT NULL,
	"line_net_minor" bigint NOT NULL,
	"line_vat_minor" bigint NOT NULL,
	"line_gross_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_item_snapshot_revision_id_unique" UNIQUE("revision_id","id"),
	CONSTRAINT "sales_order_item_snapshot_revision_line_unique" UNIQUE("revision_id","line_key"),
	CONSTRAINT "sales_order_item_snapshot_revision_position_unique" UNIQUE("revision_id","position"),
	CONSTRAINT "sales_order_item_snapshot_identity_check" CHECK ("sales_order_item_snapshot"."position" >= 0
        AND char_length("sales_order_item_snapshot"."sku") BETWEEN 1 AND 100
        AND char_length("sales_order_item_snapshot"."localized_title") BETWEEN 1 AND 200
        AND "sales_order_item_snapshot"."title_locale" IN ('bg', 'en', 'tr', 'uk')
        AND "sales_order_item_snapshot"."quantity" BETWEEN 1 AND 999),
	CONSTRAINT "sales_order_item_snapshot_money_check" CHECK ("sales_order_item_snapshot"."currency" = 'EUR'
        AND "sales_order_item_snapshot"."vat_rate_basis_points" = 2000
        AND "sales_order_item_snapshot"."catalog_unit_net_minor" > 0
        AND "sales_order_item_snapshot"."catalog_unit_gross_minor" > 0
        AND "sales_order_item_snapshot"."promotion_unit_discount_gross_minor" >= 0
        AND "sales_order_item_snapshot"."catalog_unit_gross_minor" - "sales_order_item_snapshot"."promotion_unit_discount_gross_minor" = "sales_order_item_snapshot"."effective_catalog_unit_gross_minor"
        AND "sales_order_item_snapshot"."effective_catalog_unit_net_minor" > 0
        AND "sales_order_item_snapshot"."effective_catalog_unit_gross_minor" > 0
        AND "sales_order_item_snapshot"."effective_catalog_unit_gross_minor" + "sales_order_item_snapshot"."manual_unit_adjustment_gross_minor" = "sales_order_item_snapshot"."final_unit_gross_minor"
        AND "sales_order_item_snapshot"."final_unit_net_minor" > 0
        AND "sales_order_item_snapshot"."final_unit_vat_minor" >= 0
        AND "sales_order_item_snapshot"."final_unit_gross_minor" > 0
        AND "sales_order_item_snapshot"."final_unit_net_minor" + "sales_order_item_snapshot"."final_unit_vat_minor" = "sales_order_item_snapshot"."final_unit_gross_minor"
        AND "sales_order_item_snapshot"."final_unit_net_minor" * "sales_order_item_snapshot"."quantity" = "sales_order_item_snapshot"."line_net_minor"
        AND "sales_order_item_snapshot"."final_unit_vat_minor" * "sales_order_item_snapshot"."quantity" = "sales_order_item_snapshot"."line_vat_minor"
        AND "sales_order_item_snapshot"."final_unit_gross_minor" * "sales_order_item_snapshot"."quantity" = "sales_order_item_snapshot"."line_gross_minor"),
	CONSTRAINT "sales_order_item_snapshot_promotion_check" CHECK ((
        "sales_order_item_snapshot"."source_promotion_id" IS NULL
        AND num_nonnulls("sales_order_item_snapshot"."promotion_internal_name", "sales_order_item_snapshot"."promotion_public_label", "sales_order_item_snapshot"."promotion_discount_type", "sales_order_item_snapshot"."promotion_percentage_basis_points", "sales_order_item_snapshot"."promotion_fixed_gross_minor") = 0
        AND "sales_order_item_snapshot"."promotion_unit_discount_gross_minor" = 0
      ) OR (
        "sales_order_item_snapshot"."source_promotion_id" IS NOT NULL
        AND "sales_order_item_snapshot"."promotion_internal_name" IS NOT NULL
        AND "sales_order_item_snapshot"."promotion_discount_type" = 'percentage'
        AND "sales_order_item_snapshot"."promotion_percentage_basis_points" BETWEEN 1 AND 9999
        AND "sales_order_item_snapshot"."promotion_fixed_gross_minor" IS NULL
        AND "sales_order_item_snapshot"."promotion_unit_discount_gross_minor" > 0
      ) OR (
        "sales_order_item_snapshot"."source_promotion_id" IS NOT NULL
        AND "sales_order_item_snapshot"."promotion_internal_name" IS NOT NULL
        AND "sales_order_item_snapshot"."promotion_discount_type" = 'fixed_eur'
        AND "sales_order_item_snapshot"."promotion_percentage_basis_points" IS NULL
        AND "sales_order_item_snapshot"."promotion_fixed_gross_minor" > 0
        AND "sales_order_item_snapshot"."promotion_unit_discount_gross_minor" > 0
      ))
);
--> statement-breakpoint
CREATE TABLE "sales_order_price_adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"adjustment_key" uuid NOT NULL,
	"scope" text NOT NULL,
	"item_snapshot_id" uuid,
	"amount_gross_minor" bigint NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" text,
	"actor_name" text NOT NULL,
	"actor_email" text NOT NULL,
	"actor_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_price_adjustment_revision_key_unique" UNIQUE("revision_id","adjustment_key"),
	CONSTRAINT "sales_order_price_adjustment_scope_check" CHECK (("sales_order_price_adjustment"."scope" = 'item' AND "sales_order_price_adjustment"."item_snapshot_id" IS NOT NULL)
        OR ("sales_order_price_adjustment"."scope" = 'order' AND "sales_order_price_adjustment"."item_snapshot_id" IS NULL)),
	CONSTRAINT "sales_order_price_adjustment_value_check" CHECK ("sales_order_price_adjustment"."amount_gross_minor" <> 0
        AND char_length(btrim("sales_order_price_adjustment"."reason")) BETWEEN 1 AND 500),
	CONSTRAINT "sales_order_price_adjustment_actor_check" CHECK (char_length(btrim("sales_order_price_adjustment"."actor_name")) BETWEEN 1 AND 100
        AND char_length("sales_order_price_adjustment"."actor_email") BETWEEN 3 AND 320
        AND "sales_order_price_adjustment"."actor_role" IN ('administrator', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "sales_order_audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"mutation_version" integer NOT NULL,
	"from_revision_number" integer,
	"to_revision_number" integer,
	"from_order_status" text,
	"to_order_status" text,
	"from_payment_status" text,
	"to_payment_status" text,
	"changes" jsonb NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_user_id" text,
	"actor_name" text,
	"actor_email" text,
	"actor_role" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_audit_event_order_version_unique" UNIQUE("order_id","mutation_version"),
	CONSTRAINT "sales_order_audit_event_type_check" CHECK ("sales_order_audit_event"."event_type" IN ('submitted', 'content_revised', 'order_status_changed', 'payment_status_changed')),
	CONSTRAINT "sales_order_audit_event_version_check" CHECK ("sales_order_audit_event"."mutation_version" >= 1
        AND ("sales_order_audit_event"."from_revision_number" IS NULL OR "sales_order_audit_event"."from_revision_number" >= 1)
        AND ("sales_order_audit_event"."to_revision_number" IS NULL OR "sales_order_audit_event"."to_revision_number" >= 1)),
	CONSTRAINT "sales_order_audit_event_actor_check" CHECK ((
        "sales_order_audit_event"."actor_kind" = 'guest'
        AND num_nonnulls("sales_order_audit_event"."actor_user_id", "sales_order_audit_event"."actor_name", "sales_order_audit_event"."actor_email", "sales_order_audit_event"."actor_role") = 0
      ) OR (
        "sales_order_audit_event"."actor_kind" = 'administrator'
        AND "sales_order_audit_event"."actor_name" IS NOT NULL
        AND "sales_order_audit_event"."actor_email" IS NOT NULL
        AND "sales_order_audit_event"."actor_role" IN ('administrator', 'admin')
      )),
	CONSTRAINT "sales_order_audit_event_order_status_check" CHECK (("sales_order_audit_event"."from_order_status" IS NULL OR "sales_order_audit_event"."from_order_status" IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed'))
        AND ("sales_order_audit_event"."to_order_status" IS NULL OR "sales_order_audit_event"."to_order_status" IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed'))),
	CONSTRAINT "sales_order_audit_event_payment_status_check" CHECK (("sales_order_audit_event"."from_payment_status" IS NULL OR "sales_order_audit_event"."from_payment_status" IN ('unpaid', 'partially_paid', 'paid', 'failed', 'partially_refunded', 'refunded'))
        AND ("sales_order_audit_event"."to_payment_status" IS NULL OR "sales_order_audit_event"."to_payment_status" IN ('unpaid', 'partially_paid', 'paid', 'failed', 'partially_refunded', 'refunded')))
);
--> statement-breakpoint
ALTER TABLE "sales_order_revision" ADD CONSTRAINT "sales_order_revision_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_revision" ADD CONSTRAINT "sales_order_revision_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_item_snapshot" ADD CONSTRAINT "sales_order_item_snapshot_revision_id_sales_order_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."sales_order_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_item_snapshot" ADD CONSTRAINT "sales_order_item_snapshot_source_product_id_catalog_product_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."catalog_product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_item_snapshot" ADD CONSTRAINT "sales_order_item_snapshot_source_promotion_id_catalog_promotion_id_fk" FOREIGN KEY ("source_promotion_id") REFERENCES "public"."catalog_promotion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_price_adjustment" ADD CONSTRAINT "sales_order_price_adjustment_revision_id_sales_order_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."sales_order_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_price_adjustment" ADD CONSTRAINT "sales_order_price_adjustment_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_price_adjustment" ADD CONSTRAINT "sales_order_price_adjustment_item_revision_fk" FOREIGN KEY ("revision_id","item_snapshot_id") REFERENCES "public"."sales_order_item_snapshot"("revision_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_audit_event" ADD CONSTRAINT "sales_order_audit_event_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_audit_event" ADD CONSTRAINT "sales_order_audit_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_number_idx" ON "sales_order" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_submission_key_idx" ON "sales_order" USING btree ("submission_key");--> statement-breakpoint
CREATE INDEX "sales_order_status_submitted_idx" ON "sales_order" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "sales_order_payment_status_updated_idx" ON "sales_order" USING btree ("payment_status","payment_status_updated_at");--> statement-breakpoint
CREATE INDEX "sales_order_approved_idx" ON "sales_order" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "sales_order_cancelled_idx" ON "sales_order" USING btree ("cancelled_at");--> statement-breakpoint
CREATE INDEX "sales_order_completed_idx" ON "sales_order" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "sales_order_revision_order_created_idx" ON "sales_order_revision" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_order_revision_customer_email_idx" ON "sales_order_revision" USING btree ("customer_email_normalized");--> statement-breakpoint
CREATE INDEX "sales_order_item_snapshot_product_idx" ON "sales_order_item_snapshot" USING btree ("source_product_id");--> statement-breakpoint
CREATE INDEX "sales_order_item_snapshot_promotion_idx" ON "sales_order_item_snapshot" USING btree ("source_promotion_id");--> statement-breakpoint
CREATE INDEX "sales_order_price_adjustment_revision_idx" ON "sales_order_price_adjustment" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "sales_order_audit_event_order_occurred_idx" ON "sales_order_audit_event" USING btree ("order_id","occurred_at");