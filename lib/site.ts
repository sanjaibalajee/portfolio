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

export const publicPages = [
  { href: '/', label: 'home' },
  { href: '/blog', label: 'blog' },
  { href: '/music', label: 'music' },
  { href: '/guestbook', label: 'guestbook' },
  { href: '/party', label: 'party' },
  { href: '/switch', label: 'switch' },
  { href: '/resources', label: 'resources' },
] as const

export const socialLinks = [
  { href: 'mailto:sanjaibalajee@icloud.com', label: 'email' },
  { href: 'https://github.com/sanjaibalajee', label: 'github' },
] as const
