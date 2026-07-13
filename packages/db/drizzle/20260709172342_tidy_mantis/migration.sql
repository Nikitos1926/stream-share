CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text,
	"providerAccountId" text,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_pkey" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" text,
	"action" text,
	"targetType" text,
	"targetId" text,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stream" (
	"id" text PRIMARY KEY,
	"user_id" text,
	"startedAt" timestamp with time zone DEFAULT now(),
	"endedAt" timestamp with time zone,
	"endReason" varchar,
	"status" varchar DEFAULT 'created'
);
--> statement-breakpoint
CREATE TABLE "stream_to_user" (
	"id" text PRIMARY KEY,
	"stream_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"email" varchar(512) NOT NULL CONSTRAINT "user_email_unique" UNIQUE,
	"emailVerified" timestamp,
	"image" text,
	"name" varchar(255),
	"password_hash" text,
	"role" varchar DEFAULT 'user' NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "stream" ADD CONSTRAINT "stream_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "stream_to_user" ADD CONSTRAINT "stream_to_user_stream_id_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "stream"("id");--> statement-breakpoint
ALTER TABLE "stream_to_user" ADD CONSTRAINT "stream_to_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");