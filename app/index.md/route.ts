import * as portfolio from '@/lib/portfolio-data'
import * as site from '@/lib/site'
import { markdownHeaders, portfolioMarkdown } from '@/lib/portfolio-markdown'
import { getBlogPosts } from '@/lib/blog'

export const dynamic = 'force-dynamic'

export async function GET() {
  return new Response(portfolioMarkdown(portfolio, site, await getBlogPosts()), { headers: markdownHeaders(site.siteUrl) })
}
