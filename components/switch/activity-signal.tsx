import { addDays, dateInIndia, formatShortDate } from "@/lib/switch/dates";
import type { DailyActivity } from "@/lib/switch/data";

const WEEKS = 18;
const DAYS = WEEKS * 7;

export function ActivitySignal({
  activity,
  streak,
  latestActivity,
}: {
  activity: DailyActivity[];
  streak: number;
  latestActivity: string | null;
}) {
  const today = dateInIndia();
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  const start = addDays(today, -(WEEKS - 1) * 7 - mondayOffset);
  const counts = new Map(activity.map((day) => [day.date, day.count]));
  const days = Array.from({ length: DAYS }, (_, index) => {
    const date = addDays(start, index);
    return { date, count: counts.get(date) ?? 0, future: date > today };
  });
  const activeInWindow = days.filter((day) => day.count > 0).length;
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  const weeks = Array.from({ length: WEEKS }, (_, index) => days.slice(index * 7, index * 7 + 7));

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-neutral-800 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_42%)] px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500/70">daily signal</p>
          <h2 className="mt-2 text-sm text-neutral-200">the last 18 weeks, one pulse at a time.</h2>
        </div>
        <div className="flex gap-5 text-right">
          <SignalStat value={String(streak)} label="current streak" />
          <SignalStat value={String(activeInWindow)} label="active days" />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="min-w-[510px]">
          <div
            className="grid grid-cols-[26px_1fr] gap-3"
            role="img"
            aria-label={`${activeInWindow} active days during the last 18 weeks. Current streak: ${streak} days.`}
          >
            <div className="grid grid-rows-7 gap-2 pt-[22px] text-[9px] uppercase text-neutral-700" aria-hidden="true">
              <span>mon</span>
              <span />
              <span>wed</span>
              <span />
              <span>fri</span>
              <span />
              <span>sun</span>
            </div>

            <div className="grid grid-cols-18 gap-2" aria-hidden="true">
              {weeks.map((week, weekIndex) => {
                const previousWeek = weeks[weekIndex - 1];
                const label = monthLabel(week[0].date, previousWeek?.[0].date);
                return (
                  <div key={week[0].date} className="grid grid-rows-[14px_repeat(7,12px)] gap-2">
                    <span className="text-[9px] uppercase text-neutral-600">{label}</span>
                    {week.map((day) => (
                      <span
                        key={day.date}
                        title={`${formatShortDate(day.date)} · ${day.count} ${day.count === 1 ? "solution" : "solutions"}`}
                        className={`size-3 rounded-full border transition-transform hover:scale-150 ${signalTone(day.count, maxCount, day.future)} ${day.date === today ? "ring-1 ring-emerald-300 ring-offset-2 ring-offset-[#101010]" : ""}`}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800/80 pt-4 text-[10px] text-neutral-600">
        <span>{latestActivity ? `last signal ${formatShortDate(latestActivity)}` : "waiting for the first signal"}</span>
        <span className="flex items-center gap-2" aria-label="Activity intensity: quiet to three or more solutions">
          quiet
          <span className="size-2 rounded-full border border-neutral-700 bg-neutral-900" />
          <span className="size-2 rounded-full border border-emerald-900 bg-emerald-950" />
          <span className="size-2 rounded-full border border-emerald-700 bg-emerald-600" />
          <span className="size-2 rounded-full border border-emerald-300 bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.65)]" />
          intense
        </span>
      </div>
    </section>
  );
}

function SignalStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-semibold leading-none text-neutral-100">{value}</p>
      <p className="mt-1.5 text-[9px] uppercase tracking-wide text-neutral-600">{label}</p>
    </div>
  );
}

function monthLabel(date: string, previous?: string) {
  const month = date.slice(5, 7);
  if (previous?.slice(5, 7) === month) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00.000Z`))
    .slice(0, 1);
}

function signalTone(count: number, maxCount: number, future: boolean) {
  if (future) return "border-transparent bg-transparent";
  if (count === 0) return "border-neutral-800 bg-neutral-900";
  const intensity = count / maxCount;
  if (intensity <= 0.34) return "border-emerald-900 bg-emerald-950";
  if (intensity <= 0.67) return "border-emerald-700 bg-emerald-600";
  return "border-emerald-300 bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.55)]";
}
