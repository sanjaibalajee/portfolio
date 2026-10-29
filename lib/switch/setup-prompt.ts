/** Copied from the "for nerds" note on /switch, for people who want their own agent to build this. */
export const switchSetupPrompt = `Set up a nightly sync that copies my accepted LeetCode submissions, including the code, into my own site, plus a public page that lists them.

Read the reference implementation before writing anything:
https://github.com/sanjaibalajee/portfolio
- trigger/sync-leetcode.ts: the scheduled job
- lib/switch/leetcode.ts: the LeetCode GraphQL client
- app/api/switch/ingest/route.ts and lib/switch/ingest.ts: the ingest endpoint
- db/schema.ts: the switch_* tables

How it should work:
1. Credentials: I'll copy the LEETCODE_SESSION and csrftoken cookies from a logged-in browser. Send both as cookies to https://leetcode.com/graphql/, with csrftoken also in an x-csrftoken header and Referer/Origin set to https://leetcode.com. Call userStatus { isSignedIn username } first and fail loudly if I'm signed out. The session expires roughly once a month.
2. A scheduled job runs once a day. Use whatever scheduler fits my stack (Trigger.dev, a GitHub Actions cron, a Vercel cron, etc.).
3. The job never touches the database. It asks my site's ingest endpoint (GET, bearer token) for a watermark: the timestamp of the newest stored submission.
4. Page through submissionList(offset, limit: 20), newest first, until reaching the watermark. Keep only statusDisplay === "Accepted". If the page budget runs out before the watermark, fail instead of continuing.
5. Collapse repeat solves of the same problem in the same language within 24 hours, keeping the latest.
6. Process oldest first, about 60 per run, with ~350ms between calls. submissionDetails(submissionId) returns the code, language, timestamp and the question's frontend id, slug, title and difficulty in one call. Skip submissions with no readable code.
7. POST them in batches of 20 to the ingest endpoint with the bearer token.
8. The endpoint validates the payload, upserts one row per problem and inserts one row per submission, unique on (source path, sha256 of the code), all in one transaction. Re-running a sync must never create duplicates, and the watermark must only move past what was actually stored.
9. A public page shows problems solved, current and longest streak (counted in my timezone), easy/medium/hard counts, and each solution's code highlighted on the server. Don't render LeetCode's HTML problem statements; link to the problem instead.

Look at my repo first and ask me which hosting, database and scheduler to use if it isn't obvious. Keep the database credential on the server that hosts the site, and the LeetCode cookies only in the scheduler's secrets.
`;
