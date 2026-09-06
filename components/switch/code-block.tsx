import { languageLabel } from "@/lib/switch/languages";

export { languageLabel };

export function CodeBlock({
  code,
  language,
  submittedAt,
}: {
  code: string;
  language: string;
  submittedAt?: string;
}) {
  return (
    <figure className="border border-neutral-800">
      <figcaption className="flex items-baseline justify-between gap-4 border-b border-neutral-800 px-3 py-1.5 text-xs text-neutral-500">
        <span>{languageLabel(language)}</span>
        {submittedAt && (
          <time dateTime={submittedAt}>
            {new Date(submittedAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
              timeZone: "Asia/Kolkata",
            })}
          </time>
        )}
      </figcaption>
      {/* Capped height keeps a long solution from swallowing the page; the block
          scrolls internally instead. */}
      <pre className="max-h-96 overflow-auto px-3 py-3 text-xs leading-relaxed text-neutral-300">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export function DifficultyTag({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === "Easy"
      ? "text-emerald-400/80"
      : difficulty === "Medium"
        ? "text-amber-400/80"
        : difficulty === "Hard"
          ? "text-rose-400/80"
          : "text-neutral-500";
  return <span className={`text-xs ${tone}`}>{difficulty.toLowerCase()}</span>;
}
