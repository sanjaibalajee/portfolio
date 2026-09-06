import { CodeBlock } from "@/components/switch/code-block";
import { highlightCode } from "@/lib/switch/highlight";

export async function HighlightedCodeBlock({
  code,
  language,
  submittedAt,
}: {
  code: string;
  language: string;
  submittedAt?: string;
}) {
  const highlightedHtml = await highlightCode(code, language);

  return (
    <CodeBlock
      code={code}
      language={language}
      submittedAt={submittedAt}
      highlightedHtml={highlightedHtml}
    />
  );
}
