'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github } from 'lucide-react'
import { AgentViewToggle, useAgentView } from '@/components/agent-view'
import { ThemeToggle } from '@/components/theme-toggle'
import { publicPages, socialLinks } from '@/lib/site'
import { supportsAgentView } from '@/lib/agent-routes'

export function Navbar() {
  const pathname = usePathname()
  const { setActive } = useAgentView()
  if (pathname === '/party' || pathname.startsWith('/party/')) return null
  return (
    <header className="mb-8 tracking-tight">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" onClick={() => setActive(false)} className="text-2xl font-semibold tracking-tighter text-neutral-900 dark:text-neutral-100">sanjai</Link>
        <div className="flex items-center gap-2">
          {supportsAgentView(pathname) && <AgentViewToggle />}
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {publicPages.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return <Link key={href} href={href} onClick={() => setActive(false)} aria-current={active ? 'page' : undefined} className={`py-1 transition-colors ${active ? 'font-semibold text-neutral-950 dark:text-neutral-100' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'}`}>{label}</Link>
        })}
        {socialLinks.map(({ href, label }) => (
          <a key={href} href={href} className="flex items-center gap-1 py-1 text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100">
            {label === 'github' && <Github size={14} aria-hidden="true" />}{label}
          </a>
        ))}
      </nav>
    </header>
  )
}
