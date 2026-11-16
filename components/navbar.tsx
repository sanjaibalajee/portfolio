'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github } from 'lucide-react'
import { AgentViewToggle, useAgentView } from '@/components/agent-view'
import { ThemeToggle } from '@/components/theme-toggle'
import { navPages, socialLinks } from '@/lib/site'
import { supportsAgentView } from '@/lib/agent-routes'

const within = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

export function Navbar() {
  const pathname = usePathname()
  const { setActive } = useAgentView()
  const bar = useRef<HTMLDivElement>(null)

  // On phones the bar scrolls sideways instead of wrapping; keep the current tab in view.
  useEffect(() => {
    const scroller = bar.current
    const tab = scroller?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!scroller || !tab) return
    const start = tab.offsetLeft - 24
    const end = tab.offsetLeft + tab.offsetWidth + 24 - scroller.clientWidth
    if (scroller.scrollLeft > start) scroller.scrollLeft = start
    else if (scroller.scrollLeft < end) scroller.scrollLeft = end
  }, [pathname])

  if (within(pathname, '/party')) return null
  return (
    <header className="mb-8 tracking-tight">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" onClick={() => setActive(false)} className="text-2xl font-semibold tracking-tighter text-neutral-900 dark:text-neutral-100">sanjai</Link>
        <div className="flex items-center gap-2">
          {supportsAgentView(pathname) && <AgentViewToggle />}
          <ThemeToggle />
        </div>
      </div>
      <div ref={bar} className="relative -mx-6 overflow-x-auto px-6 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)] [&::-webkit-scrollbar]:hidden">
        <nav aria-label="Primary" className="flex w-max min-w-full items-center gap-x-4 whitespace-nowrap text-sm">
          {navPages.map(({ href, label, sections = [] }) => {
            const active = href === '/' ? pathname === '/' : [href, ...sections].some(path => within(pathname, path))
            return <Link key={href} href={href} onClick={() => setActive(false)} aria-current={active ? 'page' : undefined} className={`py-1 transition-colors ${active ? 'font-semibold text-neutral-950 dark:text-neutral-100' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'}`}>{label}</Link>
          })}
          <span aria-hidden="true" className="ml-auto h-4 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          {socialLinks.map(({ href, label }) => (
            <a key={href} href={href} className="flex items-center gap-1 py-1 text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100">
              {label === 'github' && <Github size={14} aria-hidden="true" />}{label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
