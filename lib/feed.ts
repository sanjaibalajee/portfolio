type FeedPost = { slug: string; title: string; description: string; published: string }

export function rssFeed(posts: readonly FeedPost[], site: { siteUrl: URL; siteName: string; siteDescription: string }) {
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
  const url = (path: string) => escape(new URL(path, site.siteUrl).href)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${escape(site.siteName)}</title><link>${url('/blog')}</link>
<description>${escape(site.siteDescription)}</description><language>en</language>
<atom:link href="${url('/feed.xml')}" rel="self" type="application/rss+xml"/>
${posts.map(post => `<item><title>${escape(post.title)}</title><link>${url(`/blog/${post.slug}`)}</link><guid isPermaLink="true">${url(`/blog/${post.slug}`)}</guid><description>${escape(post.description)}</description><pubDate>${new Date(`${post.published}T00:00:00+05:30`).toUTCString()}</pubDate></item>`).join('\n')}
</channel></rss>\n`
}
