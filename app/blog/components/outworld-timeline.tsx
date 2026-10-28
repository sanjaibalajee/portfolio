import styles from './outworld-timeline.module.css'

import { milestones } from '@/app/blog/data/outworld-timeline'

export function OutworldTimeline() {
  return (
    <section
      aria-labelledby="outworld-timeline-heading"
      className={`${styles.timeline} not-prose my-10 border-y border-neutral-200 py-6 dark:border-neutral-800`}
    >
      <h2 id="outworld-timeline-heading" className="m-0 text-base font-medium text-neutral-900 dark:text-neutral-100">
        the timeline
      </h2>
      <ol className="mb-0 ml-1 mt-5 list-none p-0">
        {milestones.map((milestone) => (
          <li
            key={`${milestone.date}-${milestone.title}`}
            className="relative grid gap-1.5 border-l border-neutral-200 pb-6 pl-5 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5 dark:border-neutral-800"
          >
            <span aria-hidden="true" className="absolute -left-[3.5px] top-1.5 size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
            <time dateTime={milestone.date} className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              {milestone.period}
            </time>
            <div className="min-w-0">
              <h3 className="m-0 text-sm font-medium leading-5 text-neutral-900 dark:text-neutral-100">
                <a href={milestone.href} className="underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-4 dark:decoration-neutral-700 dark:hover:decoration-neutral-300">{milestone.title}</a>
              </h3>
              <p className="mb-0 mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                {milestone.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
