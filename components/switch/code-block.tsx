import { languageLabel } from "@/lib/switch/languages";

export { languageLabel };

export function CodeBlock({
  code,
  language,
  submittedAt,
  highlightedHtml,
}: {
  code: string;
  language: string;
  submittedAt?: string;
  highlightedHtml?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-neutral-800 bg-[#0d1117]">
      <figcaption className="flex items-center justify-between gap-4 border-b border-neutral-800 bg-[#161b22] px-3 py-2 text-xs text-neutral-500">
        <span className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span>{languageLabel(language)}</span>
        </span>
        {submittedAt && (
          <time dateTime={submittedAt}>
            {new Date(submittedAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
              timeZone: "Asia/Kolkata",
            })}
          </time>
        )}
      </figcaption>
      {highlightedHtml ? (
        <div
          className="switch-code"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="max-h-[32rem] overflow-auto p-4 text-[13px] leading-6 text-neutral-300">
          <code>{code}</code>
        </pre>
      )}
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
