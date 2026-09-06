import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { DifficultyTag } from "@/components/switch/code-block";
import { HighlightedCodeBlock } from "@/components/switch/highlighted-code-block";
import { isDatabaseConfigured } from "@/db/drizzle";
import { getPublicProblem } from "@/lib/switch/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isDatabaseConfigured) return { title: "switch · sanjai balajee" };
  const problem = await getPublicProblem(slug).catch(() => null);
  if (!problem) return { title: "not found · switch" };
  return {
    title: `${problem.title} · switch`,
    description: `my ${problem.difficulty.toLowerCase()} leetcode solution for ${problem.title}.`,
  };
}

export default async function SwitchProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isDatabaseConfigured) notFound();
  const problem = await getPublicProblem(slug).catch(() => null);
  if (!problem) notFound();

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <main className="flex-grow">
        <section>
          <Link href="/switch" className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors">
            ← switch
          </Link>

          <div className="mt-6 flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="font-semibold text-2xl tracking-tight text-neutral-100">
              {problem.frontendId ? `${problem.frontendId}. ` : ""}
              {problem.title}
            </h1>
            <DifficultyTag difficulty={problem.difficulty} />
          </div>

          {problem.topics.length > 0 && (
            <p className="mt-2 text-xs text-neutral-600">{problem.topics.join(" · ")}</p>
          )}

          <p className="mt-4 text-xs text-neutral-500">
            <a
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-neutral-700 underline-offset-4 hover:text-neutral-200 transition-colors"
            >
              read the problem on leetcode →
            </a>
          </p>

          {problem.firstSolvedAt && (
            <p className="mt-2 text-xs text-neutral-600">
              first solved{" "}
              {new Date(problem.firstSolvedAt).toLocaleDateString("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              })}
              {problem.solutions.length > 1 ? ` · ${problem.solutions.length} accepted submissions` : ""}
            </p>
          )}

          <div className="mt-8 space-y-5 border-t border-neutral-800 pt-8">
            {problem.solutions.map((solution) => (
              <HighlightedCodeBlock
                key={solution.id}
                code={solution.code}
                language={solution.language}
                submittedAt={solution.submittedAt}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
