import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const guestbook = pgTable("guestbook", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"oauth" | "oidc" | "email">().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] }),
  index("accounts_user_id_idx").on(account.userId),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (session) => [index("sessions_user_id_idx").on(session.userId)]);

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (token) => [primaryKey({ columns: [token.identifier, token.token] })]);

export const ingestStatus = pgEnum("switch_ingest_status", ["running", "success", "failed"]);

/**
 * One row per LeetCode problem that has been solved at least once. Rows are
 * created by the ingest endpoint from the folders the leetcode-sync GitHub
 * Action writes into the private submissions repo.
 */
export const switchProblems = pgTable("switch_problems", {
  slug: varchar("slug", { length: 200 }).primaryKey(),
  frontendId: integer("frontend_id"),
  title: varchar("title", { length: 250 }).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).default("Unknown").notNull(),
  topics: jsonb("topics").$type<string[]>().default([]).notNull(),
  url: text("url").notNull(),
  // Raw HTML problem statement, as captured by the action's README.md.
  statementHtml: text("statement_html"),
  firstSolvedAt: timestamp("first_solved_at"),
  lastSolvedAt: timestamp("last_solved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (problem) => [
  index("switch_problems_last_solved_idx").on(problem.lastSolvedAt),
]);

/**
 * One row per accepted solution file. A problem solved in two languages, or
 * re-solved later with different code, produces several rows.
 */
export const switchSubmissions = pgTable("switch_submissions", {
  id: serial("id").primaryKey(),
  problemSlug: varchar("problem_slug", { length: 200 })
    .notNull()
    .references(() => switchProblems.slug, { onDelete: "cascade" }),
  language: varchar("language", { length: 40 }).notNull(),
  code: text("code").notNull(),
  // sha256 of `code`, so a re-run of the workflow over unchanged files is a no-op
  // while a genuinely new solution for the same path is stored as a new revision.
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  // Folder + filename inside the private repo, e.g. "0001-two-sum/solution.py".
  sourcePath: text("source_path").notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (submission) => [
  uniqueIndex("switch_submissions_source_hash_idx").on(submission.sourcePath, submission.contentHash),
  index("switch_submissions_problem_idx").on(submission.problemSlug),
  index("switch_submissions_submitted_idx").on(submission.submittedAt),
]);

/** Private markdown notes, one document per problem, edited from the dashboard. */
export const switchNotes = pgTable("switch_notes", {
  id: serial("id").primaryKey(),
  problemSlug: varchar("problem_slug", { length: 200 })
    .notNull()
    .references(() => switchProblems.slug, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (note) => [uniqueIndex("switch_notes_problem_idx").on(note.problemSlug)]);

export const switchIngestRuns = pgTable("switch_ingest_runs", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 20 }).notNull(),
  status: ingestStatus("status").default("running").notNull(),
  problems: integer("problems").default(0).notNull(),
  submissions: integer("submissions").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  message: text("message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (run) => [index("switch_ingest_runs_started_idx").on(run.startedAt)]);
