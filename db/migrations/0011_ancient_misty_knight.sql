ALTER TABLE "sales_order_revision" DROP CONSTRAINT "sales_order_revision_contact_check";--> statement-breakpoint
ALTER TABLE "sales_order_revision" ADD COLUMN "customer_name_normalized" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order_revision" ADD COLUMN "delivery_address_normalized" text NOT NULL;--> statement-breakpoint
CREATE INDEX "sales_order_revision_customer_name_idx" ON "sales_order_revision" USING btree ("customer_name_normalized");--> statement-breakpoint
CREATE INDEX "sales_order_revision_delivery_address_idx" ON "sales_order_revision" USING btree ("delivery_address_normalized");--> statement-breakpoint
ALTER TABLE "sales_order_revision" ADD CONSTRAINT "sales_order_revision_contact_check" CHECK (char_length("sales_order_revision"."customer_name") BETWEEN 2 AND 100
        AND char_length("sales_order_revision"."customer_name_normalized") BETWEEN 2 AND 100
        AND char_length("sales_order_revision"."customer_phone") BETWEEN 7 AND 32
        AND char_length("sales_order_revision"."customer_phone_normalized") BETWEEN 7 AND 21
        AND char_length("sales_order_revision"."customer_email") BETWEEN 3 AND 320
        AND char_length("sales_order_revision"."customer_email_normalized") BETWEEN 3 AND 320
        AND char_length("sales_order_revision"."city") BETWEEN 2 AND 120
        AND char_length("sales_order_revision"."city_normalized") BETWEEN 2 AND 120
        AND char_length("sales_order_revision"."delivery_address") BETWEEN 5 AND 500
        AND char_length("sales_order_revision"."delivery_address_normalized") BETWEEN 5 AND 500
        AND ("sales_order_revision"."customer_note" IS NULL OR char_length("sales_order_revision"."customer_note") BETWEEN 1 AND 2000));