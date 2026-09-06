import { logger, schedules } from "@trigger.dev/sdk";
import {
  assertSignedIn,
  collapseRepeats,
  fetchSubmission,
  listAcceptedSince,
  sourcePathFor,
  type LeetCodeCredentials,
} from "../lib/switch/leetcode";

/**
 * Pulls accepted LeetCode submissions and posts them to the portfolio's ingest
 * endpoint, which owns the database. Nothing here needs DATABASE_URL.
 *
 * Set on the Trigger.dev environment:
 *   LEETCODE_SESSION, LEETCODE_CSRF_TOKEN, INGEST_URL, INGEST_TOKEN
 */

/** Detail calls per run. Keeps a first run over a long history from timing out;
 *  the remainder is picked up by the next run, oldest first, so the watermark
 *  advances without leaving gaps. */
const MAX_PER_RUN = 60;
const INGEST_BATCH = 20;
/** LeetCode throttles aggressively on rapid sequential detail reads. */
const DETAIL_DELAY_MS = 350;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set on this Trigger.dev environment`);
  return value;
}

async function readWatermark(ingestUrl: string, token: string) {
  const response = await fetch(ingestUrl, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Could not read the watermark (${response.status}): ${await response.text()}`);
  }
  const body = (await response.json()) as { lastSubmittedAtSeconds?: number };
  return body.lastSubmittedAtSeconds ?? 0;
}

async function postBatch(
  ingestUrl: string,
  token: string,
  solutions: Record<string, unknown>[],
) {
  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source: "action", solutions }),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Ingest failed (${response.status}): ${text.slice(0, 400)}`);
  return JSON.parse(text) as { problems: number; submissions: number; skipped: number };
}

export const syncLeetCode = schedules.task({
  id: "sync-leetcode",
  // 20:30 UTC == 02:00 IST. Written in UTC rather than with a timezone because
  // Trigger.dev rejects "Asia/Kolkata"; India has no DST, so the +5:30 offset is
  // fixed and this stays exact year round.
  cron: "30 20 * * *",
  maxDuration: 600,
  run: async () => {
    const credentials: LeetCodeCredentials = {
      session: requireEnv("LEETCODE_SESSION"),
      csrfToken: requireEnv("LEETCODE_CSRF_TOKEN"),
    };
    const ingestUrl = requireEnv("INGEST_URL");
    const ingestToken = requireEnv("INGEST_TOKEN");

    const username = await assertSignedIn(credentials);
    const watermark = await readWatermark(ingestUrl, ingestToken);
    logger.info("starting sync", { username, watermark });

    const { submissions: accepted, truncated } = await listAcceptedSince(credentials, watermark);
    if (truncated) {
      // The watermark advances from the oldest submission processed, so acting on
      // a partial list would skip past everything older and never return for it.
      throw new Error(
        "Reached the page budget before the end of LeetCode history. Raise maxPages in listAcceptedSince before running again.",
      );
    }
    if (!accepted.length) {
      logger.info("nothing new since the last run");
      return { fetched: 0, submissions: 0, skipped: 0, remaining: 0 };
    }

    const collapsed = collapseRepeats(accepted);
    // Oldest first, so a capped run still advances the watermark contiguously.
    const ordered = [...collapsed].sort((a, b) => a.timestamp - b.timestamp);
    const batch = ordered.slice(0, MAX_PER_RUN);
    const remaining = ordered.length - batch.length;
    logger.info("selected submissions", {
      accepted: accepted.length,
      afterCollapse: collapsed.length,
      thisRun: batch.length,
      remaining,
    });

    const solutions: Record<string, unknown>[] = [];
    for (const summary of batch) {
      const detail = await fetchSubmission(credentials, summary.id);
      if (!detail) {
        logger.warn("submission had no readable code", { id: summary.id, slug: summary.titleSlug });
        continue;
      }
      solutions.push({
        path: sourcePathFor(detail),
        frontendId: detail.frontendId,
        slug: detail.titleSlug,
        title: detail.title,
        language: detail.language,
        code: detail.code,
        submittedAt: detail.submittedAt.toISOString(),
      });
      await delay(DETAIL_DELAY_MS);
    }

    const totals = { submissions: 0, skipped: 0, problems: 0 };
    for (let index = 0; index < solutions.length; index += INGEST_BATCH) {
      const result = await postBatch(
        ingestUrl,
        ingestToken,
        solutions.slice(index, index + INGEST_BATCH),
      );
      totals.problems += result.problems;
      totals.submissions += result.submissions;
      totals.skipped += result.skipped;
    }

    logger.info("sync complete", { ...totals, remaining });
    return { fetched: solutions.length, ...totals, remaining };
  },
});
