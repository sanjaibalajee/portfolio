import { createHash } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { switchIngestRuns, switchProblems, switchSubmissions } from "@/db/schema";

export const solutionSchema = z.object({
  /** Repo-relative path of the solution file, e.g. "0001-two-sum/solution.py". */
  path: z.string().trim().min(1).max(500),
  /** LeetCode's displayed problem number, taken from the folder prefix. */
  frontendId: z.number().int().positive().nullable().default(null),
  /** Best-effort slug from the folder name; the server re-resolves it against LeetCode. */
  slug: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(250).optional(),
  language: z.string().trim().min(1).max(40),
  code: z.string().min(1).max(200_000),
  submittedAt: z.string().datetime(),
  /** Raw HTML statement from the action's README.md. */
  statement: z.string().max(400_000).nullable().optional(),
});

export const ingestSchema = z.object({
  source: z.enum(["action", "manual"]).default("action"),
  solutions: z.array(solutionSchema).min(1).max(200),
});

export type IngestPayload = z.infer<typeof ingestSchema>;
type Solution = z.infer<typeof solutionSchema>;

type Metadata = {
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  frontendId: number | null;
};

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Ask LeetCode for the canonical title, difficulty and topics. This is the public
 * GraphQL endpoint, so it needs no credentials, but it can be rate limited or
 * return nothing for premium problems — a miss is not fatal, it just means the
 * row keeps the folder-derived title and an "Unknown" difficulty.
 */
async function fetchMetadata(slug: string): Promise<Metadata | null> {
  const query = `
    query questionMeta($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags { name }
      }
    }
  `;
  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/problems/${slug}/`,
        "User-Agent": "switch-tracker/2.0",
      },
      body: JSON.stringify({ query, variables: { titleSlug: slug } }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: {
        question?: {
          questionFrontendId?: string;
          title?: string;
          titleSlug?: string;
          difficulty?: string;
          topicTags?: { name: string }[];
        } | null;
      };
    };
    const question = payload.data?.question;
    if (!question?.titleSlug) return null;
    return {
      slug: question.titleSlug,
      title: question.title ?? titleFromSlug(slug),
      difficulty: question.difficulty ?? "Unknown",
      topics: question.topicTags?.map((tag) => tag.name) ?? [],
      frontendId: question.questionFrontendId ? Number(question.questionFrontendId) : null,
    };
  } catch {
    return null;
  }
}

function hash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function ingestSolutions(payload: IngestPayload) {
  const [run] = await db.insert(switchIngestRuns).values({ source: payload.source }).returning();

  try {
    // Resolve each distinct problem once, even when several languages solve it.
    const slugs = [...new Set(payload.solutions.map((solution) => solution.slug))];

    // The workflow re-sends every folder on every run, so reuse metadata already
    // stored rather than hitting LeetCode again for problems we know about.
    const cached = new Map(
      (await db
        .select()
        .from(switchProblems)
        .where(inArray(switchProblems.slug, slugs)))
        .filter((problem) => problem.difficulty !== "Unknown")
        .map((problem) => [problem.slug, {
          slug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty,
          topics: problem.topics ?? [],
          frontendId: problem.frontendId,
        } satisfies Metadata]),
    );

    const metadata = new Map<string, Metadata>();
    for (const slug of slugs) {
      const known = cached.get(slug);
      if (known) {
        metadata.set(slug, known);
        continue;
      }
      const resolved = await fetchMetadata(slug);
      metadata.set(slug, resolved ?? {
        slug,
        title: titleFromSlug(slug),
        difficulty: "Unknown",
        topics: [],
        frontendId: null,
      });
    }

    const grouped = new Map<string, Solution[]>();
    for (const solution of payload.solutions) {
      const canonical = metadata.get(solution.slug)!.slug;
      grouped.set(canonical, [...(grouped.get(canonical) ?? []), solution]);
    }

    let insertedSubmissions = 0;
    let skipped = 0;

    for (const [canonicalSlug, solutions] of grouped) {
      const meta = metadata.get(solutions[0].slug)!;
      const dates = solutions.map((solution) => new Date(solution.submittedAt));
      const earliest = new Date(Math.min(...dates.map((date) => date.getTime())));
      const latest = new Date(Math.max(...dates.map((date) => date.getTime())));
      const statement = solutions.find((solution) => solution.statement)?.statement ?? null;
      const frontendId = meta.frontendId ?? solutions.find((s) => s.frontendId)?.frontendId ?? null;

      await db
        .insert(switchProblems)
        .values({
          slug: canonicalSlug,
          frontendId,
          title: meta.title || solutions[0].title || titleFromSlug(canonicalSlug),
          difficulty: meta.difficulty,
          topics: meta.topics,
          url: `https://leetcode.com/problems/${canonicalSlug}/`,
          statementHtml: statement,
          firstSolvedAt: earliest,
          lastSolvedAt: latest,
        })
        .onConflictDoUpdate({
          target: switchProblems.slug,
          set: {
            frontendId: sql`coalesce(excluded.frontend_id, ${switchProblems.frontendId})`,
            title: sql`excluded.title`,
            // Never downgrade a known difficulty back to "Unknown" on a later run.
            difficulty: sql`case when excluded.difficulty = 'Unknown' then ${switchProblems.difficulty} else excluded.difficulty end`,
            topics: sql`case when jsonb_array_length(excluded.topics) = 0 then ${switchProblems.topics} else excluded.topics end`,
            statementHtml: sql`coalesce(excluded.statement_html, ${switchProblems.statementHtml})`,
            firstSolvedAt: sql`least(coalesce(${switchProblems.firstSolvedAt}, excluded.first_solved_at), excluded.first_solved_at)`,
            lastSolvedAt: sql`greatest(coalesce(${switchProblems.lastSolvedAt}, excluded.last_solved_at), excluded.last_solved_at)`,
            updatedAt: new Date(),
          },
        });

      for (const solution of solutions) {
        const inserted = await db
          .insert(switchSubmissions)
          .values({
            problemSlug: canonicalSlug,
            language: solution.language,
            code: solution.code,
            contentHash: hash(solution.code),
            sourcePath: solution.path,
            submittedAt: new Date(solution.submittedAt),
          })
          .onConflictDoNothing({
            target: [switchSubmissions.sourcePath, switchSubmissions.contentHash],
          })
          .returning({ id: switchSubmissions.id });
        if (inserted.length) insertedSubmissions += 1;
        else skipped += 1;
      }
    }

    const result = {
      problems: grouped.size,
      submissions: insertedSubmissions,
      skipped,
    };
    await db
      .update(switchIngestRuns)
      .set({ ...result, status: "success", completedAt: new Date() })
      .where(eq(switchIngestRuns.id, run.id));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingest error";
    await db
      .update(switchIngestRuns)
      .set({ status: "failed", message, completedAt: new Date() })
      .where(eq(switchIngestRuns.id, run.id));
    throw error;
  }
}
