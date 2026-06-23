import { type ReactNode } from "react"

interface HighlightProps {
  children: ReactNode
  note?: ReactNode
}

// the one line in a section i'd reach for a marker and underline —
// with an optional margin note for the thought underneath it.
export function Highlight({ children, note }: HighlightProps) {
  return (
    <figure className="my-8">
      <div className="relative rounded-lg border-l-2 border-amber-400/80 dark:border-amber-500/70 bg-amber-50/60 dark:bg-amber-950/20 pl-5 pr-4 py-4">
        <p className="text-lg leading-relaxed text-neutral-800 dark:text-neutral-200">
          <span className="bg-amber-200/50 dark:bg-amber-400/15 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] px-0.5">
            {children}
          </span>
        </p>
      </div>
      {note && (
        <p className="mt-2 pl-5 text-sm italic text-neutral-600 dark:text-neutral-400">
          <span className="not-italic text-amber-600/70 dark:text-amber-500/60 mr-1">
            ↳
          </span>
          {note}
        </p>
      )}
    </figure>
  )
}
