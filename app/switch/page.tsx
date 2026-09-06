import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { CodeBlock, DifficultyTag } from "@/components/switch/code-block";
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

              <div className="mt-10 space-y-12">
                {problems.map((problem) => (
                  <article key={problem.slug} className="border-t border-neutral-800 pt-6">
                    <div className="flex items-baseline justify-between gap-4 flex-wrap">
                      <h2 className="text-base text-neutral-100">
                        <Link
                          href={`/switch/${problem.slug}`}
                          className="underline decoration-neutral-700 underline-offset-4 hover:text-white transition-colors"
                        >
                          {problem.frontendId ? `${problem.frontendId}. ` : ""}
                          {problem.title}
                        </Link>
                      </h2>
                      <DifficultyTag difficulty={problem.difficulty} />
                    </div>
                    {problem.topics.length > 0 && (
                      <p className="mt-1.5 text-xs text-neutral-600">{problem.topics.join(" · ")}</p>
                    )}

                    <div className="mt-4 space-y-4">
                      {problem.solutions.map((solution) => (
                        <CodeBlock
                          key={solution.id}
                          code={solution.code}
                          language={solution.language}
                          submittedAt={solution.submittedAt}
                        />
                      ))}
                    </div>
                  </article>
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
