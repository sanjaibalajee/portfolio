import { type ReactNode } from "react"

interface BigQuoteProps {
  children: ReactNode
}

// an impact pull-quote for the one line in a section i want to land hard.
export function BigQuote({ children }: BigQuoteProps) {
  return (
    <div className="my-10">
      <p className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug text-neutral-900 dark:text-neutral-100">
        <span className="text-neutral-300 dark:text-neutral-700 select-none mr-1">
          —
        </span>
        {children}
      </p>
    </div>
  )
}
