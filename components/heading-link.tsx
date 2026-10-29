'use client'

import { useState } from 'react'

export function HeadingLink({ id }: { id: string }) {
  const [message, setMessage] = useState('')
  return <>
    <a href={`#${id}`} aria-label="Copy link to this section" title={message || 'Copy link to this section'} className="section-link ml-1 inline-flex size-8 items-center justify-center text-sm font-normal text-neutral-500 no-underline opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={async () => {
      try {
        const url = new URL(window.location.href)
        url.hash = id
        await navigator.clipboard.writeText(url.href)
        setMessage('link copied')
      } catch { setMessage('use the address bar to copy this section link') }
    }}>#</a>
    <span className="sr-only" aria-live="polite">{message}</span>
  </>
}
