DROP INDEX "order_notification_recipient_active_email_idx";--> statement-breakpoint
DROP INDEX "order_notification_recipient_active_name_idx";--> statement-breakpoint
ALTER TABLE "order_notification_recipient" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "order_notification_recipient" ADD CONSTRAINT "order_notification_recipient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_notification_recipient_user_idx" ON "order_notification_recipient" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_notification_recipient_active_user_idx" ON "order_notification_recipient" USING btree ("active","user_id");