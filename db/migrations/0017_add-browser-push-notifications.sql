CREATE TABLE "web_push_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"claim_token" uuid,
	"claimed_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" text,
	"failure_disposition" text,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "web_push_delivery_values_check" CHECK ("web_push_delivery"."attempt_count" >= 0
        AND ("web_push_delivery"."last_error_code" IS NULL OR "web_push_delivery"."last_error_code" IN (
          'ACCESS_REVOKED', 'OWNERSHIP_MISMATCH', 'SUBSCRIPTION_GONE',
          'VAPID_KEY_STALE', 'PAYLOAD_INVALID', 'PROVIDER_FAILURE'
        ))
        AND ("web_push_delivery"."failure_disposition" IS NULL OR "web_push_delivery"."failure_disposition" IN (
          'permanent', 'retry_exhausted', 'cancelled'
        ))),
	CONSTRAINT "web_push_delivery_state_check" CHECK ((
        "web_push_delivery"."status" = 'pending'
        AND "web_push_delivery"."next_attempt_at" IS NOT NULL
        AND num_nonnulls("web_push_delivery"."claim_token", "web_push_delivery"."claimed_at", "web_push_delivery"."sent_at", "web_push_delivery"."failed_at", "web_push_delivery"."failure_disposition", "web_push_delivery"."last_error_code") = 0
      ) OR (
        "web_push_delivery"."status" = 'processing'
        AND "web_push_delivery"."next_attempt_at" IS NULL
        AND "web_push_delivery"."claim_token" IS NOT NULL
        AND "web_push_delivery"."claimed_at" IS NOT NULL
        AND "web_push_delivery"."last_attempt_at" IS NOT NULL
        AND "web_push_delivery"."attempt_count" >= 1
        AND num_nonnulls("web_push_delivery"."sent_at", "web_push_delivery"."failed_at", "web_push_delivery"."failure_disposition", "web_push_delivery"."last_error_code") = 0
      ) OR (
        "web_push_delivery"."status" = 'sent'
        AND "web_push_delivery"."next_attempt_at" IS NULL
        AND "web_push_delivery"."sent_at" IS NOT NULL
        AND num_nonnulls("web_push_delivery"."claim_token", "web_push_delivery"."claimed_at", "web_push_delivery"."failed_at", "web_push_delivery"."failure_disposition", "web_push_delivery"."last_error_code") = 0
      ) OR (
        "web_push_delivery"."status" IN ('failed', 'cancelled')
        AND "web_push_delivery"."next_attempt_at" IS NULL
        AND "web_push_delivery"."failed_at" IS NOT NULL
        AND "web_push_delivery"."failure_disposition" IS NOT NULL
        AND "web_push_delivery"."last_error_code" IS NOT NULL
        AND num_nonnulls("web_push_delivery"."claim_token", "web_push_delivery"."claimed_at", "web_push_delivery"."sent_at") = 0
      ))
);
--> statement-breakpoint
CREATE TABLE "web_push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"endpoint_hash" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"locale" text NOT NULL,
	"vapid_key_fingerprint" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_delivered_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "web_push_subscription_values_check" CHECK (char_length("web_push_subscription"."endpoint") BETWEEN 12 AND 2048
        AND char_length("web_push_subscription"."endpoint_hash") = 64
        AND char_length("web_push_subscription"."p256dh") BETWEEN 80 AND 120
        AND char_length("web_push_subscription"."auth") BETWEEN 20 AND 32
        AND "web_push_subscription"."locale" IN ('bg', 'en', 'tr', 'uk')
        AND char_length("web_push_subscription"."vapid_key_fingerprint") = 64),
	CONSTRAINT "web_push_subscription_state_check" CHECK ((
        "web_push_subscription"."status" = 'active'
        AND "web_push_subscription"."disabled_at" IS NULL
        AND "web_push_subscription"."expired_at" IS NULL
      ) OR (
        "web_push_subscription"."status" = 'disabled'
        AND "web_push_subscription"."disabled_at" IS NOT NULL
        AND "web_push_subscription"."expired_at" IS NULL
      ) OR (
        "web_push_subscription"."status" = 'expired'
        AND "web_push_subscription"."expired_at" IS NOT NULL
      ))
);
--> statement-breakpoint
ALTER TABLE "web_push_delivery" ADD CONSTRAINT "web_push_delivery_notification_id_user_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."user_notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_push_delivery" ADD CONSTRAINT "web_push_delivery_subscription_id_web_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."web_push_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_push_subscription" ADD CONSTRAINT "web_push_subscription_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "web_push_delivery_notification_subscription_idx" ON "web_push_delivery" USING btree ("notification_id","subscription_id");--> statement-breakpoint
CREATE INDEX "web_push_delivery_due_idx" ON "web_push_delivery" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "web_push_delivery_stale_claim_idx" ON "web_push_delivery" USING btree ("status","claimed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "web_push_subscription_endpoint_hash_idx" ON "web_push_subscription" USING btree ("endpoint_hash");--> statement-breakpoint
CREATE INDEX "web_push_subscription_user_status_idx" ON "web_push_subscription" USING btree ("recipient_user_id","status");