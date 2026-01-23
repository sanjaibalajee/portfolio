'use client'

interface DiffBlockProps {
  children: string
}

export function DiffBlock({ children }: DiffBlockProps) {
  const lines = children.trim().split('\n')

  return (
    <pre className="bg-neutral-50 dark:bg-neutral-900 rounded-lg overflow-x-auto mb-4 text-sm font-mono border border-neutral-200 dark:border-neutral-800 py-2">
      <code>
        {lines.map((line, i) => {
          let className = 'block px-4 py-0.5 '

          if (line.startsWith('+') && !line.startsWith('+++')) {
            className += 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 mb-4'
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            className += 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
          } else if (line.startsWith('# ---')) {
            className += 'text-neutral-900 dark:text-neutral-100 font-semibold mt-8 mb-3 text-base border-b border-neutral-200 dark:border-neutral-700 pb-2'
          } else if (line.startsWith('#')) {
            className += 'text-neutral-500 dark:text-neutral-400 mt-2 mb-1'
          } else {
            className += 'text-neutral-700 dark:text-neutral-300'
          }

          // Skip empty lines since we're adding margins
          if (line.trim() === '') return null

          return (
            <span key={i} className={className}>
              {line}
            </span>
          )
        })}
      </code>
    </pre>
  )
}
