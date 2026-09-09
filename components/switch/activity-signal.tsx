import { addDays, dateInIndia, formatShortDate } from "@/lib/switch/dates";
import type { DailyActivity } from "@/lib/switch/data";

const WEEKS = 52;
const DAYS = WEEKS * 7;

/**
 * One square per day for the last year. The grid is a fr grid, so the squares
 * shrink with the column instead of scrolling sideways on a phone.
 */
export function ActivitySignal({ activity }: { activity: DailyActivity[] }) {
  const today = dateInIndia();
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  const start = addDays(today, -(WEEKS - 1) * 7 - mondayOffset);
  const counts = new Map(activity.map((day) => [day.date, day.count]));
  const days = Array.from({ length: DAYS }, (_, index) => {
    const date = addDays(start, index);
    return { date, count: counts.get(date) ?? 0, future: date > today };
  });
  const weeks = Array.from({ length: WEEKS }, (_, index) => days.slice(index * 7, index * 7 + 7));
  const activeDays = days.filter((day) => day.count > 0).length;
  const solutions = days.reduce((total, day) => total + day.count, 0);

  return (
    <section className="mt-10 border-t border-neutral-800 pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm text-neutral-300">activity</h2>
        <p className="text-xs text-neutral-600">the last 52 weeks</p>
      </div>

      <div
        className="mt-4 grid grid-cols-52 gap-px sm:gap-[2px]"
        role="img"
        aria-label={`${solutions} solutions across ${activeDays} days in the last 52 weeks.`}
      >
        {weeks.map((week, weekIndex) => (
          <div key={week[0].date} className="relative flex flex-col gap-px pt-3.5 sm:gap-[2px]">
            <span className="absolute left-0 top-0 text-[8px] leading-none text-neutral-700 sm:text-[9px]" aria-hidden="true">
              {monthLabel(week[0].date, weeks[weekIndex - 1]?.[0].date)}
            </span>
            {week.map((day) => (
              <span
                key={day.date}
                aria-hidden="true"
                title={
                  day.future
                    ? undefined
                    : `${formatShortDate(day.date)} · ${day.count} ${day.count === 1 ? "solution" : "solutions"}`
                }
                className={`aspect-square w-full ${tone(day.count, day.future)} ${
                  day.date === today ? "ring-1 ring-neutral-600" : ""
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-neutral-600">
        <span>
          {solutions} {solutions === 1 ? "solution" : "solutions"} across {activeDays}{" "}
          {activeDays === 1 ? "day" : "days"}
        </span>
        <span className="flex items-center gap-1.5">
          less
          <span className="size-2 bg-neutral-900" />
          <span className="size-2 bg-emerald-900" />
          <span className="size-2 bg-emerald-700" />
          <span className="size-2 bg-emerald-500" />
          more
        </span>
      </div>
    </section>
  );
}

function monthLabel(date: string, previous?: string) {
  const month = date.slice(5, 7);
  if (!previous || previous.slice(5, 7) === month) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00.000Z`))
    .toLowerCase();
}

/** Absolute steps, not a share of the busiest day, so the legend means the same thing every week. */
function tone(count: number, future: boolean) {
  if (future) return "bg-transparent";
  if (count === 0) return "bg-neutral-900";
  if (count === 1) return "bg-emerald-900";
  if (count === 2) return "bg-emerald-700";
  return "bg-emerald-500";
}
