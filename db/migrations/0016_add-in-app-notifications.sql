CREATE TABLE "user_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"deduplication_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "user_notification_recipient_deduplication_unique" UNIQUE("recipient_user_id","deduplication_key"),
	CONSTRAINT "user_notification_values_check" CHECK (char_length("user_notification"."kind") BETWEEN 1 AND 80
        AND "user_notification"."payload_version" >= 1
        AND char_length("user_notification"."deduplication_key") BETWEEN 1 AND 200)
);
--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_notification_recipient_newest_idx" ON "user_notification" USING btree ("recipient_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_notification_recipient_unread_newest_idx" ON "user_notification" USING btree ("recipient_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "user_notification"."read_at" IS NULL;