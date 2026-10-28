import { rssFeed } from '@/lib/feed'
import { posts } from '@/lib/blog'
import * as site from '@/lib/site'

export const dynamic = 'force-static'

export function GET() {
  return new Response(rssFeed(posts, site), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  })
}
