ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'customer';--> statement-breakpoint
UPDATE "user" SET "role" = 'customer' WHERE "role" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" IN ('customer', 'admin'));
