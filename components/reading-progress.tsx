'use client'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { usePathname } from 'next/navigation'
import blogposts from '@/app/blog/blogposts.json'
import { useAgentView } from '@/components/agent-view'
import { parseReadingPosition, readingStorageKey, readingTarget, type ReadingPosition } from '@/lib/reading-progress'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const headings = (article: HTMLElement) => [...article.querySelectorAll<HTMLElement>('h2[id], h3[id]')]
const top = (element: HTMLElement) => element.getBoundingClientRect().top + window.scrollY

export function ReadingProgress() {
  const pathname = usePathname()
  if (!blogposts.posts.some(post => pathname === `/blog/${post.slug}`)) return null
  return <PostReadingProgress key={pathname} pathname={pathname} />
}

function PostReadingProgress({ pathname }: { pathname: string }) {
  const { active } = useAgentView()
  const marker = useRef<HTMLDivElement>(null)
  const lastPosition = useRef<ReadingPosition | null | undefined>(undefined)
  const pendingResume = useRef<ReadingPosition | null>(null)
  const interacted = useRef(false)
  const [resume, setResume] = useState<ReadingPosition | null>(null)
  const key = readingStorageKey(pathname)

  useEffect(() => {
    if (active) return
    const article = marker.current?.closest('article')
    if (!article) return
    // Agent-mode and browser restoration scrolls require fresh reader input.
    interacted.current = false
    let frame = 0
    let saveTimer: ReturnType<typeof setTimeout> | undefined
    const initial = requestAnimationFrame(() => {
      try {
        const saved = parseReadingPosition(localStorage.getItem(key))
        // Explicit section links and native back/forward restoration keep priority.
        if (saved && !window.location.hash && window.scrollY < top(article) + window.innerHeight * 0.5) {
          pendingResume.current = saved
          setResume(saved)
        }
      } catch { /* Reading still works when browser storage is unavailable. */ }
    })

    function write() {
      const position = lastPosition.current
      if (position === undefined) return
      try {
        if (position) localStorage.setItem(key, JSON.stringify(position))
        else localStorage.removeItem(key)
      } catch { /* Storage can be disabled or full. */ }
    }

    function capture() {
      frame = 0
      if (!interacted.current || !article || marker.current?.closest('article') !== article || !article.getClientRects().length) return
      const rect = article.getBoundingClientRect()
      const start = rect.top + window.scrollY
      const end = start + rect.height
      const scrollable = Math.max(1, rect.height - window.innerHeight + 32)
      const point = window.scrollY + 32
      const progress = clamp((point - start) / scrollable)
      if (pendingResume.current) {
        // A small scroll to reach the prompt should not erase a saved place.
        if (progress < 0.05) return
        pendingResume.current = null
        flushSync(() => setResume(null))
        capture()
        return
      }
      if (rect.height < window.innerHeight * 1.5 || progress < 0.05 || progress >= 0.98 || rect.bottom <= window.innerHeight + 24) {
        lastPosition.current = null
      } else {
        const sections = headings(article)
        let index = -1
        sections.forEach((section, current) => { if (top(section) <= point) index = current })
        const sectionStart = index < 0 ? start : top(sections[index])
        const sectionEnd = index + 1 < sections.length ? top(sections[index + 1]) : end
        lastPosition.current = {
          version: 1, anchor: index < 0 ? null : sections[index].id,
          sectionProgress: clamp((point - sectionStart) / Math.max(1, sectionEnd - sectionStart)),
          progress, savedAt: Date.now(),
        }
      }
      clearTimeout(saveTimer)
      saveTimer = setTimeout(write, 500)
    }

    const arm = () => { interacted.current = true }
    const keyInput = (event: KeyboardEvent) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) arm() }
    const scroll = () => { if (interacted.current && !frame) frame = requestAnimationFrame(capture) }
    const flush = () => { capture(); write() }
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('wheel', arm, { passive: true })
    window.addEventListener('touchmove', arm, { passive: true })
    window.addEventListener('pointerdown', arm, { passive: true })
    window.addEventListener('keydown', keyInput)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelAnimationFrame(initial)
      cancelAnimationFrame(frame)
      clearTimeout(saveTimer)
      write()
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('wheel', arm)
      window.removeEventListener('touchmove', arm)
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', keyInput)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [active, key])

  function continueReading() {
    if (!resume) return
    const position = resume
    pendingResume.current = null
    flushSync(() => setResume(null))
    const article = marker.current?.closest('article')
    if (!article) return
    const sections = headings(article)
    const index = sections.findIndex(section => section.id === position.anchor)
    const section = index < 0 ? undefined : { top: top(sections[index]), bottom: index + 1 < sections.length ? top(sections[index + 1]) : top(article) + article.offsetHeight }
    const target = readingTarget(position, top(article), Math.max(1, article.offsetHeight - window.innerHeight + 32), section)
    interacted.current = true
    const focus = index < 0 ? article : sections[index]
    focus.tabIndex = -1
    focus.focus({ preventScroll: true })
    window.scrollTo({ top: target, behavior: 'instant' })
  }

  function startOver() {
    pendingResume.current = null
    lastPosition.current = null
    try { localStorage.removeItem(key) } catch { /* Storage is optional. */ }
    flushSync(() => setResume(null))
    const article = marker.current?.closest('article')
    if (article) window.scrollTo({ top: Math.max(0, top(article) - 32), behavior: 'instant' })
  }

  return <div ref={marker} className="not-prose" data-reading-progress>
    {resume && !active && <aside aria-label="Continue reading this post" className="mb-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-lg border border-neutral-200 px-4 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
      <p className="m-0! text-xs! text-neutral-600! dark:text-neutral-400!">you left off around {Math.round(resume.progress * 100)}%. <span className="block mt-1 text-neutral-500 dark:text-neutral-400">saved on this device.</span></p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={continueReading} className="min-h-9 underline underline-offset-4 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 dark:hover:text-neutral-100">continue reading →</button>
        <button type="button" onClick={startOver} className="min-h-9 underline underline-offset-4 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 dark:hover:text-neutral-100">start over</button>
      </div>
    </aside>}
  </div>
}
