'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github } from 'lucide-react'

const navItems = {
  '/': {
    name: 'home',
  },
  '/blog': {
    name: 'blog',
  },
  '/music': {
    name: 'music',
  },
  '/guestbook': {
    name: 'guestbook',
  },
}

const socialLinks = {
  'mailto:sanjaibalajee@icloud.com': {
    name: 'email',
  },
  'https://github.com/sanjaibalajee': {
    name: 'github',
  },
}

export function Navbar() {
  const pathname = usePathname()

  return (
    <aside className="-ml-[8px] mb-6 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <h1 className="font-semibold text-2xl mb-4 md:mb-8 tracking-tighter">sanjai</h1>
        <nav
          className="flex flex-col md:flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-0 w-full">
            <div className="flex flex-row flex-wrap items-center gap-1">
              {Object.entries(navItems).map(([path, { name }]) => {
                const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path)
                return (
                  <Link
                    key={path}
                    href={path}
                    className={`transition-all flex align-middle relative py-1 px-2 no-underline ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {name}
                  </Link>
                )
              })}
              <span className="hidden md:inline px-2"></span>
              {Object.entries(socialLinks).map(([path, { name }]) => {
                return (
                  <Link
                    key={path}
                    href={path}
                    className="transition-all text-white hover:opacity-70 flex align-middle items-center gap-1 relative py-1 px-2 no-underline"
                  >
                    {name === 'github' && <Github size={16} />}
                    {name}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}
