import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { ActivitySignal } from "@/components/switch/activity-signal";
import { DifficultyTag } from "@/components/switch/code-block";
import { HighlightedCodeBlock } from "@/components/switch/highlighted-code-block";
import { isDatabaseConfigured } from "@/db/drizzle";
import { getPublicSwitch } from "@/lib/switch/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "switch · sanjai balajee",
  description: "problems solved, the streak, and the code behind each one.",
};

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
      <main className="flex-grow">
        <section>
          {/* No link to /switch/dashboard: the private side is reached by typing
              the URL, so nothing here advertises that it exists. */}
          <h1 className="font-semibold text-3xl tracking-tight text-neutral-100 mb-8">switch.</h1>
          <p className="leading-relaxed text-neutral-300 mb-10">
            every problem i&apos;ve solved, the streak behind them, and the code i actually submitted.
          </p>

          {!stats || !problems.length ? (
            <div className="border-t border-neutral-800 pt-8 text-sm text-neutral-500">
              solutions will appear here after the first sync.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-7 border-y border-neutral-800 py-8">
                <Stat value={String(stats.solved)} label="problems solved" />
                <Stat value={String(stats.streak)} label="day streak" />
                <Stat value={String(stats.longestStreak)} label="longest streak" />
                <Stat value={String(stats.activeDays)} label="active days" />
              </div>

              <p className="pt-6 text-xs text-neutral-600">
                {stats.byDifficulty.easy} easy · {stats.byDifficulty.medium} medium · {stats.byDifficulty.hard} hard
                {stats.languages.length ? ` · ${stats.languages.join(", ")}` : ""}
              </p>

              <ActivitySignal activity={activity} />

              <div className="mt-10 divide-y divide-neutral-800 border-y border-neutral-800">
                {problems.map((problem) => (
                  <details key={problem.slug} className="switch-problem group">
                    <summary className="flex cursor-pointer items-start justify-between gap-4 py-5 outline-none transition-colors hover:bg-neutral-900/30 focus-visible:bg-neutral-900/30">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm text-neutral-200 transition-colors group-hover:text-white">
                          <span className="inline-block text-neutral-600 transition-transform group-open:rotate-90" aria-hidden="true">
                            ›
                          </span>
                          {problem.frontendId ? `${problem.frontendId}. ` : ""}
                          {problem.title}
                        </span>
                        <span className="mt-1.5 block pl-4 text-xs text-neutral-600">
                          {problem.solutions.length} {problem.solutions.length === 1 ? "solution" : "solutions"}
                          {problem.topics.length > 0 ? ` · ${problem.topics.slice(0, 3).join(" · ")}` : ""}
                        </span>
                      </span>
                      <DifficultyTag difficulty={problem.difficulty} />
                    </summary>

                    <div className="space-y-4 pb-7 pl-4 sm:pl-6">
                      <Link
                        href={`/switch/${problem.slug}`}
                        className="inline-block text-xs text-neutral-500 underline decoration-neutral-700 underline-offset-4 transition-colors hover:text-neutral-200"
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
                <p className="border-t border-neutral-800 mt-12 pt-6 text-xs text-neutral-600">
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
      </main>
      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
