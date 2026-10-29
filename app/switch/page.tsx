import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Mark } from "@/components/mark";
import { ActivitySignal } from "@/components/switch/activity-signal";
import { CopyPrompt } from "@/components/switch/copy-prompt";
import { switchSetupPrompt } from "@/lib/switch/setup-prompt";
import { DifficultyTag } from "@/components/switch/code-block";
import { HighlightedCodeBlock } from "@/components/switch/highlighted-code-block";
import { isDatabaseConfigured } from "@/db/drizzle";
import { getPublicSwitch } from "@/lib/switch/data";
import { pageMetadata } from '@/lib/site'

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata('/switch', 'switch', 'problems solved, the streak, and the code behind each one.')

export default async function SwitchPage() {
  let data: Awaited<ReturnType<typeof getPublicSwitch>> | null = null;
  if (isDatabaseConfigured) {
    try {
      data = await getPublicSwitch();
    } catch (error) {
      console.error("Unable to load public Switch progress", error);
    }
  }

  const stats = data?.stats;
  const problems = data?.problems ?? [];
  const activity = data?.activity ?? [];

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          {/* No link to /switch/dashboard: the private side is reached by typing
              the URL, so nothing here advertises that it exists. */}
          <h1 className="font-semibold text-3xl tracking-tight text-neutral-900 dark:text-neutral-100 mb-8">switch.</h1>
          <p className="leading-relaxed text-neutral-700 dark:text-neutral-300 mb-10">
            every problem i&apos;ve solved, the streak behind them, and the code i actually submitted.
          </p>

          <SyncNotes />

          {!stats || !problems.length ? (
            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8 text-sm text-neutral-600 dark:text-neutral-400">
              solutions will appear here after the first sync.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-7 border-y border-neutral-200 dark:border-neutral-800 py-8">
                <Stat value={String(stats.solved)} label="problems solved" />
                <Stat value={String(stats.streak)} label="day streak" />
                <Stat value={String(stats.longestStreak)} label="longest streak" />
                <Stat value={String(stats.activeDays)} label="active days" />
              </div>

              <p className="pt-6 text-xs text-neutral-600 dark:text-neutral-400">
                {stats.byDifficulty.easy} easy · {stats.byDifficulty.medium} medium · {stats.byDifficulty.hard} hard
                {stats.languages.length ? ` · ${stats.languages.join(", ")}` : ""}
              </p>

              <ActivitySignal activity={activity} />

              <div className="mt-10 divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
                {problems.map((problem) => (
                  <details key={problem.slug} className="switch-problem group">
                    <summary className="flex cursor-pointer items-start justify-between gap-4 py-5 outline-none transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-900/30 dark:focus-visible:bg-neutral-900/30">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200 transition-colors group-hover:text-neutral-950 dark:group-hover:text-white">
                          <span className="inline-block text-neutral-600 dark:text-neutral-400 transition-transform group-open:rotate-90" aria-hidden="true">
                            ›
                          </span>
                          {problem.frontendId ? `${problem.frontendId}. ` : ""}
                          {problem.title}
                        </span>
                        <span className="mt-1.5 block pl-4 text-xs text-neutral-600 dark:text-neutral-400">
                          {problem.solutions.length} {problem.solutions.length === 1 ? "solution" : "solutions"}
                          {problem.topics.length > 0 ? ` · ${problem.topics.slice(0, 3).join(" · ")}` : ""}
                        </span>
                      </span>
                      <DifficultyTag difficulty={problem.difficulty} />
                    </summary>

                    <div className="space-y-4 pb-7 pl-4 sm:pl-6">
                      <Link
                        href={`/switch/${problem.slug}`}
                        className="inline-block text-xs text-neutral-600 dark:text-neutral-400 underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-4 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
                      >
                        open problem page →
                      </Link>
                      {problem.solutions.map((solution) => (
                        <HighlightedCodeBlock
                          key={solution.id}
                          code={solution.code}
                          language={solution.language}
                          submittedAt={solution.submittedAt}
                        />
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              {stats.lastSolvedAt && (
                <p className="border-t border-neutral-200 dark:border-neutral-800 mt-12 pt-6 text-xs text-neutral-600 dark:text-neutral-400">
                  last solved{" "}
                  {new Date(stats.lastSolvedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  })}
                </p>
              )}
            </>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-900 dark:text-neutral-100">{children}</code>;
}

const SYNC_STEPS: ReactNode[] = [
  <>every night at 02:00 ist, a trigger.dev cron task signs in to leetcode&apos;s graphql api with my session cookies.</>,
  <>it asks this site for a watermark: the timestamp of the newest submission already stored.</>,
  <>it pages back through <Code>submissionList</Code>, 20 at a time, until it hits the watermark, and keeps only accepted ones. retries of the same problem in the same language within 24 hours collapse into one.</>,
  <>oldest first, <Code>submissionDetails</Code> returns the code, title, difficulty and problem number in one call. it waits 350ms between calls and stops at 60 per run, so a long backlog spreads over a few nights.</>,
  <>batches of 20 go to <Code>POST /api/switch/ingest</Code> with a bearer token. the database credential never leaves vercel.</>,
  <>the route checks the payload with zod and writes problems and submissions to neon postgres in one atomic batch. submissions are keyed on path plus a sha-256 of the code, so running the same sync twice never adds a duplicate.</>,
  <>this page reads straight from postgres on every request. shiki highlights the code on the server, and streaks are counted in india time.</>,
];

// how the leetcode sync works, collapsed under the intro for anyone curious.
function SyncNotes() {
  return (
    <details className="switch-problem group mb-10 border-y border-neutral-200 dark:border-neutral-800">
      <summary className="flex cursor-pointer items-center gap-2 py-5 text-sm text-neutral-800 dark:text-neutral-200 outline-none transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-900/30 dark:focus-visible:bg-neutral-900/30">
        <span className="inline-block text-neutral-600 dark:text-neutral-400 transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        for nerds: how this stays in sync
      </summary>

      <div className="space-y-6 pb-7 pl-4 sm:pl-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <p className="text-xs leading-loose">
          <Mark tone="amber">leetcode</Mark> → <Mark tone="blue">trigger.dev</Mark> → <Mark tone="blue">/api/switch/ingest</Mark> → <Mark>postgres</Mark> → this page
        </p>

        <ol className="space-y-3">
          {SYNC_STEPS.map((step, index) => (
            <li key={index} className="grid grid-cols-[2rem_1fr] gap-x-1">
              <span className="text-neutral-500 dark:text-neutral-500">{String(index + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p>
          the watermark only moves past what actually got stored. if a run dies halfway, the next one starts from the last submission that made it, so nothing gets skipped.
        </p>
        <p className="text-neutral-600 dark:text-neutral-400">
          the weak spot is the leetcode session cookie. it expires about once a month, the task fails loudly, and i paste in a new one.
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <CopyPrompt text={switchSetupPrompt} />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">want your own? hand this to your agent.</span>
        </div>
      </div>
    </details>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{label}</p>
    </div>
  );
}
