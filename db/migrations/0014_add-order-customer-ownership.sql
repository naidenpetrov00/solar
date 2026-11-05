ALTER TABLE "sales_order_audit_event" DROP CONSTRAINT "sales_order_audit_event_actor_check";--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "customer_user_id" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_customer_user_id_user_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_order_customer_submitted_idx" ON "sales_order" USING btree ("customer_user_id","submitted_at","order_number_sequence") WHERE "sales_order"."customer_user_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order_audit_event" ADD CONSTRAINT "sales_order_audit_event_actor_check" CHECK ((
        "sales_order_audit_event"."actor_kind" = 'guest'
        AND num_nonnulls("sales_order_audit_event"."actor_user_id", "sales_order_audit_event"."actor_name", "sales_order_audit_event"."actor_email", "sales_order_audit_event"."actor_role") = 0
      ) OR (
        "sales_order_audit_event"."actor_kind" = 'customer'
        AND "sales_order_audit_event"."actor_name" IS NOT NULL
        AND "sales_order_audit_event"."actor_email" IS NOT NULL
        AND "sales_order_audit_event"."actor_role" IN ('customer', 'administrator', 'admin')
      ) OR (
        "sales_order_audit_event"."actor_kind" = 'administrator'
        AND "sales_order_audit_event"."actor_name" IS NOT NULL
        AND "sales_order_audit_event"."actor_email" IS NOT NULL
        AND "sales_order_audit_event"."actor_role" IN ('administrator', 'admin')
      ));