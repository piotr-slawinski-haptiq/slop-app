CREATE TYPE "public"."fulfillment_status" AS ENUM('pending', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_trigger" AS ENUM('immediate', 'threshold');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('immediate', 'threshold');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'in_fulfillment', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('orderer', 'colleague');--> statement-breakpoint
CREATE TABLE "fulfillment_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_pending_items" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_settings_singleton_chk" CHECK ("fulfillment_settings"."id" = 1),
	CONSTRAINT "fulfillment_settings_min_pending_items_chk" CHECK ("fulfillment_settings"."min_pending_items" >= 1)
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" "fulfillment_trigger" NOT NULL,
	"status" "fulfillment_status" NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"is_evergreen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"requester_id" integer NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"fulfillment_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fulfillments_fulfilled_at_idx" ON "fulfillments" USING btree ("fulfilled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "items_name_category_uq" ON "items" USING btree ("name","category");--> statement-breakpoint
CREATE INDEX "items_name_idx" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "magic_link_tokens_email_idx" ON "magic_link_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "requests_item_id_idx" ON "requests" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "requests_requester_id_idx" ON "requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "requests_fulfillment_id_idx" ON "requests" USING btree ("fulfillment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "requests_one_active_per_item_idx" ON "requests" USING btree ("item_id") WHERE "requests"."status" in ('pending', 'in_fulfillment') and "requests"."fulfillment_id" is null;--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");