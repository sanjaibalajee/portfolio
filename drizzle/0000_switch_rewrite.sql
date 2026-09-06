-- Replaces the plan/check-in/LeetCode-polling schema with a solution log fed by
-- the leetcode-sync GitHub Action. The dropped tables held only planning data.
DROP TABLE IF EXISTS "switch_checkins" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "switch_plan_items" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "switch_plans" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "switch_sync_runs" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "switch_submissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "switch_problems" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."switch_plan_mode";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."switch_plan_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."switch_checkin_kind";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."switch_solve_outcome";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."switch_sync_status";--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."switch_ingest_status" AS ENUM('running', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guestbook" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "switch_ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(20) NOT NULL,
	"status" "switch_ingest_status" DEFAULT 'running' NOT NULL,
	"problems" integer DEFAULT 0 NOT NULL,
	"submissions" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "switch_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_slug" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "switch_problems" (
	"slug" varchar(200) PRIMARY KEY NOT NULL,
	"frontend_id" integer,
	"title" varchar(250) NOT NULL,
	"difficulty" varchar(20) DEFAULT 'Unknown' NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"url" text NOT NULL,
	"statement_html" text,
	"first_solved_at" timestamp,
	"last_solved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "switch_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_slug" varchar(200) NOT NULL,
	"language" varchar(40) NOT NULL,
	"code" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"source_path" text NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "switch_notes" ADD CONSTRAINT "switch_notes_problem_slug_switch_problems_slug_fk" FOREIGN KEY ("problem_slug") REFERENCES "public"."switch_problems"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "switch_submissions" ADD CONSTRAINT "switch_submissions_problem_slug_switch_problems_slug_fk" FOREIGN KEY ("problem_slug") REFERENCES "public"."switch_problems"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "switch_ingest_runs_started_idx" ON "switch_ingest_runs" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "switch_notes_problem_idx" ON "switch_notes" USING btree ("problem_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "switch_problems_last_solved_idx" ON "switch_problems" USING btree ("last_solved_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "switch_submissions_source_hash_idx" ON "switch_submissions" USING btree ("source_path","content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "switch_submissions_problem_idx" ON "switch_submissions" USING btree ("problem_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "switch_submissions_submitted_idx" ON "switch_submissions" USING btree ("submitted_at");