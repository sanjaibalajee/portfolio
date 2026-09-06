"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CodeBlock, DifficultyTag, languageLabel } from "@/components/switch/code-block";
import type { DashboardProblem, SwitchStats } from "@/lib/switch/data";

type HighlightedProblem = Omit<DashboardProblem, "solutions"> & {
  solutions: Array<DashboardProblem["solutions"][number] & { highlightedHtml: string }>;
};

type LastRun = {
  source: string;
  status: string;
  problems: number;
  submissions: number;
  skipped: number;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type DashboardData = {
  problems: HighlightedProblem[];
  stats: SwitchStats;
  lastRun: LastRun | null;
};

export function SwitchDashboard({ initialData }: { initialData: DashboardData }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "noted" | "unnoted">("all");
  const { stats, problems, lastRun } = initialData;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return problems.filter((problem) => {
      if (filter === "noted" && !problem.note) return false;
      if (filter === "unnoted" && problem.note) return false;
      if (!needle) return true;
      return (
        problem.title.toLowerCase().includes(needle) ||
        problem.slug.includes(needle) ||
        problem.topics.some((topic) => topic.toLowerCase().includes(needle))
      );
    });
  }, [problems, query, filter]);

  const noted = problems.filter((problem) => problem.note).length;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-7 border-y border-neutral-800 py-6">
        <Stat value={String(stats.solved)} label="solved" />
        <Stat value={String(stats.streak)} label="day streak" />
        <Stat value={String(stats.longestStreak)} label="longest" />
        <Stat value={`${noted}/${stats.solved}`} label="with notes" />
      </div>

      <p className="text-xs text-neutral-600">{formatLastRun(lastRun)}</p>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search title or topic"
          className="switch-input sm:max-w-xs"
        />
        <div className="flex gap-4 text-xs">
          {(["all", "unnoted", "noted"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`transition-colors ${filter === value ? "text-neutral-100" : "text-neutral-600 hover:text-neutral-300"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-neutral-800 border-t border-neutral-800">
        {visible.length ? (
          visible.map((problem) => <ProblemRow key={problem.slug} problem={problem} />)
        ) : (
          <p className="py-6 text-sm text-neutral-500">
            {problems.length ? "nothing matches that filter." : "no solutions ingested yet."}
          </p>
        )}
      </div>
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

function ProblemRow({ problem }: { problem: HighlightedProblem }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(problem.note ?? "");
  const [saved, setSaved] = useState(problem.note ?? "");
  const [updatedAt, setUpdatedAt] = useState(problem.noteUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = note !== saved;

  async function saveNote() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/switch/notes/${problem.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the note");
      setSaved(note);
      setUpdatedAt(data.note?.updatedAt ?? null);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not save the note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-4">
      <div className="flex gap-4 justify-between items-start">
        <div className="min-w-0">
          <Link
            href={`/switch/${problem.slug}`}
            className="text-sm text-neutral-200 hover:text-white underline decoration-neutral-700 underline-offset-4 transition-colors"
          >
            {problem.frontendId ? `${problem.frontendId}. ` : ""}
            {problem.title}
          </Link>
          <p className="text-xs text-neutral-600 mt-1">
            {problem.lastSolvedAt
              ? new Date(problem.lastSolvedAt).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                  timeZone: "Asia/Kolkata",
                })
              : "unknown date"}
            {" · "}
            {problem.solutions.map((solution) => languageLabel(solution.language)).join(", ") || "no code"}
            {problem.topics.length ? ` · ${problem.topics.slice(0, 3).join(", ")}` : ""}
          </p>
        </div>
        <DifficultyTag difficulty={problem.difficulty} />
      </div>

      <div className="flex gap-4 mt-3 text-xs">
        <button onClick={() => setOpen((value) => !value)} className="text-neutral-500 hover:text-neutral-200">
          {open ? "close" : saved ? "edit note" : "add note"}
        </button>
        {saved && !open && <span className="text-neutral-700">note saved</span>}
      </div>

      {open && (
        <div className="mt-5 pl-4 border-l border-neutral-700 space-y-4">
          <label className="block text-xs text-neutral-500">
            <span className="block mb-1.5">markdown notes</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={20_000}
              rows={10}
              placeholder={"## pattern\n\nwhat made this click. recognition clue for next time."}
              className="switch-input resize-y font-mono"
            />
          </label>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => void saveNote()}
              disabled={saving || !dirty}
              className="text-neutral-200 hover:text-white disabled:text-neutral-600"
            >
              {saving ? "saving…" : dirty ? "save note →" : "saved"}
            </button>
            {updatedAt && (
              <span className="text-neutral-700">
                updated{" "}
                {new Date(updatedAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            )}
            {error && <span className="text-red-400">{error}</span>}
          </div>

          {problem.solutions.map((solution) => (
            <CodeBlock
              key={solution.id}
              code={solution.code}
              language={solution.language}
              submittedAt={solution.submittedAt}
              highlightedHtml={solution.highlightedHtml}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatLastRun(run: LastRun | null) {
  if (!run) return "no sync from the submissions repo yet";
  const when = new Date(run.completedAt ?? run.startedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  if (run.status === "failed") return `last sync failed · ${run.message ?? "retry the workflow"} · ${when}`;
  if (run.status === "running") return `sync running since ${when}`;
  return `last sync ${when} · ${run.submissions} new, ${run.skipped} unchanged`;
}
