import { blogMarkdown } from '@/lib/blog-markdown'
import { markdownHeaders } from '@/lib/portfolio-markdown'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const document = await blogMarkdown(`/${path.join('/')}`)
  if (document) return new Response(document.markdown, { headers: markdownHeaders(document.url) })
  return new Response('# Not found\n\nThere is no blog post at this address.\n\n[Blog index](/blog/index.md)\n', {
    status: 404,
    headers: { ...markdownHeaders(new URL('/blog', siteUrl)), 'X-Robots-Tag': 'noindex, nofollow' },
  })
}
