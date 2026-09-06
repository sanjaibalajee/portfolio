import { desc, eq, inArray } from "drizzle-orm";
import { db, requireDatabase } from "@/db/drizzle";
import {
  switchIngestRuns,
  switchNotes,
  switchProblems,
  switchSubmissions,
} from "@/db/schema";
import { dateInIndia } from "@/lib/switch/dates";

export type SolutionView = {
  id: number;
  language: string;
  code: string;
  submittedAt: string;
};

export type ProblemView = {
  slug: string;
  frontendId: number | null;
  title: string;
  difficulty: string;
  topics: string[];
  url: string;
  firstSolvedAt: string | null;
  lastSolvedAt: string | null;
  solutions: SolutionView[];
};

export type SwitchStats = {
  solved: number;
  submissions: number;
  streak: number;
  longestStreak: number;
  activeDays: number;
  byDifficulty: { easy: number; medium: number; hard: number };
  languages: string[];
  lastSolvedAt: string | null;
};

/**
 * Every distinct calendar day (Asia/Kolkata) on which a solution was accepted,
 * ascending. Streaks are counted over these.
 */
function solveDays(timestamps: Date[]) {
  return [...new Set(timestamps.map((value) => dateInIndia(value)))].sort();
}

function previousDay(day: string) {
  const value = new Date(`${day}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

/** Days counted back from today; yesterday still counts so a streak survives until midnight. */
export function currentStreak(days: string[], today = dateInIndia()) {
  const unique = new Set(days);
  let cursor = unique.has(today) ? today : previousDay(today);
  let streak = 0;
  while (unique.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function longestStreak(days: string[]) {
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous && previousDay(day) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

function toProblemViews(
  problems: (typeof switchProblems.$inferSelect)[],
  submissions: (typeof switchSubmissions.$inferSelect)[],
): ProblemView[] {
  const byProblem = new Map<string, SolutionView[]>();
  for (const submission of submissions) {
    const list = byProblem.get(submission.problemSlug) ?? [];
    list.push({
      id: submission.id,
      language: submission.language,
      code: submission.code,
      submittedAt: submission.submittedAt.toISOString(),
    });
    byProblem.set(submission.problemSlug, list);
  }

  return problems.map((problem) => ({
    slug: problem.slug,
    frontendId: problem.frontendId,
    title: problem.title,
    difficulty: problem.difficulty,
    topics: problem.topics ?? [],
    url: problem.url,
    firstSolvedAt: problem.firstSolvedAt?.toISOString() ?? null,
    lastSolvedAt: problem.lastSolvedAt?.toISOString() ?? null,
    solutions: byProblem.get(problem.slug) ?? [],
  }));
}

async function loadProblemsWithSolutions() {
  const problems = await db
    .select()
    .from(switchProblems)
    .orderBy(desc(switchProblems.lastSolvedAt));
  if (!problems.length) return [] as ProblemView[];

  const submissions = await db
    .select()
    .from(switchSubmissions)
    .where(inArray(switchSubmissions.problemSlug, problems.map((problem) => problem.slug)))
    .orderBy(desc(switchSubmissions.submittedAt));

  return toProblemViews(problems, submissions);
}

function summarise(problems: ProblemView[]): SwitchStats {
  const timestamps = problems.flatMap((problem) =>
    problem.solutions.map((solution) => new Date(solution.submittedAt)),
  );
  const days = solveDays(timestamps);
  const difficulty = { easy: 0, medium: 0, hard: 0 };
  for (const problem of problems) {
    const key = problem.difficulty.toLowerCase();
    if (key === "easy" || key === "medium" || key === "hard") difficulty[key] += 1;
  }

  return {
    solved: problems.length,
    submissions: timestamps.length,
    streak: currentStreak(days),
    longestStreak: longestStreak(days),
    activeDays: days.length,
    byDifficulty: difficulty,
    languages: [...new Set(problems.flatMap((problem) => problem.solutions.map((s) => s.language)))].sort(),
    lastSolvedAt: problems.map((problem) => problem.lastSolvedAt).filter(Boolean).sort().at(-1) ?? null,
  };
}

/** Everything the public /switch page renders. */
export async function getPublicSwitch() {
  requireDatabase();
  const problems = await loadProblemsWithSolutions();
  return { problems, stats: summarise(problems) };
}

export async function getPublicProblem(slug: string) {
  requireDatabase();
  const [problem] = await db.select().from(switchProblems).where(eq(switchProblems.slug, slug)).limit(1);
  if (!problem) return null;
  const submissions = await db
    .select()
    .from(switchSubmissions)
    .where(eq(switchSubmissions.problemSlug, slug))
    .orderBy(desc(switchSubmissions.submittedAt));
  const [view] = toProblemViews([problem], submissions);
  return { ...view, statementHtml: problem.statementHtml };
}

export async function getPublicProblemSlugs() {
  requireDatabase();
  return db.select({ slug: switchProblems.slug }).from(switchProblems);
}

export type DashboardProblem = ProblemView & { note: string | null; noteUpdatedAt: string | null };

/** Everything the private dashboard renders: the public data plus notes. */
export async function getSwitchDashboard() {
  requireDatabase();
  const problems = await loadProblemsWithSolutions();
  const notes = problems.length
    ? await db.select().from(switchNotes).where(inArray(switchNotes.problemSlug, problems.map((p) => p.slug)))
    : [];
  const byProblem = new Map(notes.map((note) => [note.problemSlug, note]));

  const [lastRun] = await db
    .select()
    .from(switchIngestRuns)
    .orderBy(desc(switchIngestRuns.startedAt))
    .limit(1);

  return {
    problems: problems.map<DashboardProblem>((problem) => {
      const note = byProblem.get(problem.slug);
      return {
        ...problem,
        note: note?.body ?? null,
        noteUpdatedAt: note?.updatedAt.toISOString() ?? null,
      };
    }),
    stats: summarise(problems),
    lastRun: lastRun
      ? {
          source: lastRun.source,
          status: lastRun.status,
          problems: lastRun.problems,
          submissions: lastRun.submissions,
          skipped: lastRun.skipped,
          message: lastRun.message,
          startedAt: lastRun.startedAt.toISOString(),
          completedAt: lastRun.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}
