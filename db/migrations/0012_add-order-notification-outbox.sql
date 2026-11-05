CREATE TABLE "order_notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"source_audit_event_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"locale" text NOT NULL,
	"notification_kind" text NOT NULL,
	"recipient_type" text NOT NULL,
	"template_version" integer NOT NULL,
	"recipient_configuration_id" uuid,
	"customer_recipient_name" text,
	"customer_recipient_email" text,
	"internal_recipient_name" text,
	"internal_recipient_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"cycle_attempt_count" integer DEFAULT 0 NOT NULL,
	"manual_retry_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"claim_token" uuid,
	"claimed_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" text,
	"failure_disposition" text,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"mutation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_notification_outbox_recipient_shape_check" CHECK ((
        "order_notification_outbox"."notification_kind" IN ('customer_order_received', 'customer_order_approved', 'customer_order_rejected', 'customer_order_cancelled')
        AND "order_notification_outbox"."recipient_type" = 'customer'
        AND "order_notification_outbox"."recipient_configuration_id" IS NULL
        AND "order_notification_outbox"."customer_recipient_name" IS NOT NULL
        AND "order_notification_outbox"."customer_recipient_email" IS NOT NULL
        AND "order_notification_outbox"."internal_recipient_name" IS NULL
        AND "order_notification_outbox"."internal_recipient_email" IS NULL
      ) OR (
        "order_notification_outbox"."notification_kind" = 'internal_new_order'
        AND "order_notification_outbox"."recipient_type" = 'internal'
        AND "order_notification_outbox"."recipient_configuration_id" IS NOT NULL
        AND "order_notification_outbox"."customer_recipient_name" IS NULL
        AND "order_notification_outbox"."customer_recipient_email" IS NULL
        AND "order_notification_outbox"."internal_recipient_name" IS NOT NULL
        AND "order_notification_outbox"."internal_recipient_email" IS NOT NULL
      )),
	CONSTRAINT "order_notification_outbox_identity_check" CHECK ("order_notification_outbox"."revision_number" >= 1
        AND "order_notification_outbox"."locale" IN ('bg', 'en', 'tr', 'uk')
        AND "order_notification_outbox"."template_version" >= 1
        AND "order_notification_outbox"."mutation_version" >= 1
        AND "order_notification_outbox"."attempt_count" >= 0
        AND "order_notification_outbox"."cycle_attempt_count" >= 0
        AND "order_notification_outbox"."attempt_count" >= "order_notification_outbox"."cycle_attempt_count"
        AND "order_notification_outbox"."manual_retry_count" >= 0),
	CONSTRAINT "order_notification_outbox_recipient_values_check" CHECK (("order_notification_outbox"."customer_recipient_name" IS NULL OR char_length("order_notification_outbox"."customer_recipient_name") BETWEEN 2 AND 100)
        AND ("order_notification_outbox"."customer_recipient_email" IS NULL OR char_length("order_notification_outbox"."customer_recipient_email") BETWEEN 3 AND 320)
        AND ("order_notification_outbox"."internal_recipient_name" IS NULL OR char_length("order_notification_outbox"."internal_recipient_name") BETWEEN 2 AND 100)
        AND ("order_notification_outbox"."internal_recipient_email" IS NULL OR char_length("order_notification_outbox"."internal_recipient_email") BETWEEN 3 AND 320)),
	CONSTRAINT "order_notification_outbox_error_code_check" CHECK ("order_notification_outbox"."last_error_code" IS NULL OR "order_notification_outbox"."last_error_code" IN ('SMTP_TEMPORARY', 'SMTP_PERMANENT', 'COMPOSITION_FAILED', 'TEMPLATE_UNSUPPORTED', 'SNAPSHOT_INVALID')),
	CONSTRAINT "order_notification_outbox_state_check" CHECK ((
        "order_notification_outbox"."status" = 'pending'
        AND "order_notification_outbox"."next_attempt_at" IS NOT NULL
        AND num_nonnulls("order_notification_outbox"."claim_token", "order_notification_outbox"."claimed_at", "order_notification_outbox"."sent_at", "order_notification_outbox"."failed_at", "order_notification_outbox"."failure_disposition", "order_notification_outbox"."last_error_code") = 0
      ) OR (
        "order_notification_outbox"."status" = 'processing'
        AND "order_notification_outbox"."next_attempt_at" IS NULL
        AND "order_notification_outbox"."claim_token" IS NOT NULL
        AND "order_notification_outbox"."claimed_at" IS NOT NULL
        AND "order_notification_outbox"."last_attempt_at" IS NOT NULL
        AND "order_notification_outbox"."attempt_count" >= 1
        AND num_nonnulls("order_notification_outbox"."sent_at", "order_notification_outbox"."failed_at", "order_notification_outbox"."failure_disposition", "order_notification_outbox"."last_error_code") = 0
      ) OR (
        "order_notification_outbox"."status" = 'sent'
        AND "order_notification_outbox"."next_attempt_at" IS NULL
        AND "order_notification_outbox"."claim_token" IS NULL
        AND "order_notification_outbox"."claimed_at" IS NULL
        AND "order_notification_outbox"."sent_at" IS NOT NULL
        AND "order_notification_outbox"."last_attempt_at" IS NOT NULL
        AND "order_notification_outbox"."attempt_count" >= 1
        AND num_nonnulls("order_notification_outbox"."failed_at", "order_notification_outbox"."failure_disposition", "order_notification_outbox"."last_error_code") = 0
      ) OR (
        "order_notification_outbox"."status" = 'failed'
        AND "order_notification_outbox"."next_attempt_at" IS NULL
        AND "order_notification_outbox"."claim_token" IS NULL
        AND "order_notification_outbox"."claimed_at" IS NULL
        AND "order_notification_outbox"."sent_at" IS NULL
        AND "order_notification_outbox"."failed_at" IS NOT NULL
        AND "order_notification_outbox"."last_attempt_at" IS NOT NULL
        AND "order_notification_outbox"."attempt_count" >= 1
        AND "order_notification_outbox"."failure_disposition" IN ('permanent', 'retry_exhausted')
        AND "order_notification_outbox"."last_error_code" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "order_notification_recipient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"mutation_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_notification_recipient_values_check" CHECK (char_length("order_notification_recipient"."name") BETWEEN 2 AND 100
        AND char_length("order_notification_recipient"."email") BETWEEN 3 AND 320
        AND char_length("order_notification_recipient"."email_normalized") BETWEEN 3 AND 320
        AND "order_notification_recipient"."email_normalized" = lower("order_notification_recipient"."email_normalized")
        AND "order_notification_recipient"."mutation_version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "order_notification_outbox" ADD CONSTRAINT "order_notification_outbox_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notification_outbox" ADD CONSTRAINT "order_notification_outbox_source_audit_event_id_sales_order_audit_event_id_fk" FOREIGN KEY ("source_audit_event_id") REFERENCES "public"."sales_order_audit_event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notification_outbox" ADD CONSTRAINT "order_notification_outbox_revision_id_sales_order_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."sales_order_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notification_outbox" ADD CONSTRAINT "order_notification_outbox_recipient_configuration_id_order_notification_recipient_id_fk" FOREIGN KEY ("recipient_configuration_id") REFERENCES "public"."order_notification_recipient"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_notification_outbox_customer_event_kind_idx" ON "order_notification_outbox" USING btree ("source_audit_event_id","notification_kind") WHERE "order_notification_outbox"."recipient_type" = 'customer';--> statement-breakpoint
CREATE UNIQUE INDEX "order_notification_outbox_internal_event_kind_recipient_idx" ON "order_notification_outbox" USING btree ("source_audit_event_id","notification_kind","recipient_configuration_id") WHERE "order_notification_outbox"."recipient_type" = 'internal';--> statement-breakpoint
CREATE INDEX "order_notification_outbox_due_idx" ON "order_notification_outbox" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "order_notification_outbox_stale_claim_idx" ON "order_notification_outbox" USING btree ("status","claimed_at");--> statement-breakpoint
CREATE INDEX "order_notification_outbox_order_history_idx" ON "order_notification_outbox" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_notification_recipient_active_email_idx" ON "order_notification_recipient" USING btree ("email_normalized") WHERE "order_notification_recipient"."active" = true;--> statement-breakpoint
CREATE INDEX "order_notification_recipient_active_name_idx" ON "order_notification_recipient" USING btree ("active","name");