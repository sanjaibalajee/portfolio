'use client'

import { useState, ReactNode, Children, isValidElement, cloneElement } from 'react'

interface ExperienceItemProps {
  company: string
  role: string
  location: string
  period: string
  children?: ReactNode
}

export function ExperienceItem({ company, role, location, period, children }: ExperienceItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!children) {
    return (
      <div className="mb-8 pl-4 sm:pl-5 border-l-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100">{company}</h3>
          <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">{role}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            <span>{location}</span>
            <span className="text-neutral-400 dark:text-neutral-600">•</span>
            <span>{period}</span>
          </div>
        </div>
      </div>
    )
  }

  const childArray = Children.toArray(children)
  const firstChild = childArray[0]

  return (
    <div className="mb-8 pl-4 sm:pl-5 border-l-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
      <div className="flex flex-col gap-1 mb-3">
        <h3 className="font-semibold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100">{company}</h3>
        <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">{role}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          <span>{location}</span>
          <span className="text-neutral-400 dark:text-neutral-600">•</span>
          <span>{period}</span>
        </div>
      </div>
      <div className="leading-relaxed text-sm sm:text-base text-neutral-800 dark:text-neutral-200 space-y-2">
        {firstChild}
        {isExpanded && <div className="mt-3 space-y-2">{childArray.slice(1)}</div>}
      </div>
      {childArray.length > 1 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-sm transition-all text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline underline-offset-2 decoration-neutral-400 dark:decoration-neutral-600"
        >
          {isExpanded ? 'show less' : 'show more'}
        </button>
      )}
    </div>
  )
}
