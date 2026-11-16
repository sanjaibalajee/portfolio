export const siteUrl = new URL('https://www.sanjaibalajee.com')
export const siteName = 'sanjai balajee'
export const siteDescription = 'backends, ios apps and agents. notes from sanjai balajee.'

export function pageMetadata(path: string, title: string, description: string) {
  const url = new URL(path, siteUrl).href
  const images = [{ url: '/og/home', width: 1200, height: 630, alt: siteName }]
  return {
    title: `${title} | ${siteName}`, description,
    alternates: { canonical: url, types: { 'application/rss+xml': '/feed.xml' } },
    openGraph: { title: `${title} | ${siteName}`, description, url, images },
    twitter: { card: 'summary_large_image' as const, title: `${title} | ${siteName}`, description, images },
  }
}

// Linked from /resources instead of the nav bar, which keeps the bar to one row.
export const resourcePages = [
  { href: '/resources/slides', label: 'slides', description: 'presentation decks from talks and workshops.' },
  { href: '/party', label: 'party', description: 'a little multiplayer chaos. imposter, psych, drawing relays and games for your group chat.' },
  { href: '/switch', label: 'switch', description: 'problems solved, the streak, and the code behind each one.' },
] as const

// `sections` lists the other paths a nav tab stays active on.
export const navPages: readonly { href: string; label: string; sections?: readonly string[] }[] = [
  { href: '/', label: 'home' },
  { href: '/blog', label: 'blog' },
  { href: '/skills', label: 'skills' },
  { href: '/music', label: 'music' },
  { href: '/guestbook', label: 'guestbook' },
  { href: '/resources', label: 'resources', sections: ['/party', '/switch'] },
]

// Every top-level page, for the sitemap and agent-facing page lists.
export const publicPages = [
  ...navPages.map(({ href, label }) => ({ href, label })),
  { href: '/party', label: 'party' },
  { href: '/switch', label: 'switch' },
]

export const socialLinks = [
  { href: 'mailto:sanjaibalajee@icloud.com', label: 'email' },
  { href: 'https://github.com/sanjaibalajee', label: 'github' },
] as const
