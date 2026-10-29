"use client";

import { useState } from "react";

export function CopyPrompt({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("error");
        }
      }}
      aria-live="polite"
      className="inline-flex min-h-9 items-center border border-neutral-300 dark:border-neutral-700 px-3 text-xs text-neutral-800 dark:text-neutral-200 transition-colors hover:border-neutral-500 hover:text-neutral-950 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {state === "copied" ? "copied, paste it into your agent" : state === "error" ? "could not copy" : "copy setup prompt"}
    </button>
  );
}
