ALTER TABLE "order_notification_outbox" ADD COLUMN "customer_view_order_url" text;--> statement-breakpoint
ALTER TABLE "order_notification_outbox" ADD CONSTRAINT "order_notification_outbox_customer_view_order_url_check" CHECK ("order_notification_outbox"."customer_view_order_url" IS NULL OR (
        "order_notification_outbox"."recipient_type" = 'customer'
        AND "order_notification_outbox"."template_version" = 2
      ));