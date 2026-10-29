import type { ReactNode } from 'react'

export type MarkTone = 'green' | 'blue' | 'amber'

// inline terminal-style highlight, styled by .terminal-highlight in globals.css.
export function Mark({ children, tone = 'green' }: { children: ReactNode; tone?: MarkTone }) {
  return <span className="terminal-highlight" data-tone={tone}>{children}</span>
}
