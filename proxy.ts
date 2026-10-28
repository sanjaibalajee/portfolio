import { NextResponse, type NextRequest } from 'next/server'
import { prefersMarkdown } from '@/lib/portfolio-markdown'
import { supportsAgentView } from '@/lib/agent-routes'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const blog = pathname === '/blog' || pathname.startsWith('/blog/')
  const directMarkdown = blog && pathname.endsWith('.md')
  const markdown = ['GET', 'HEAD'].includes(request.method) && (directMarkdown || prefersMarkdown(request.headers.get('accept')))
  if (!supportsAgentView(pathname) && !(blog && markdown)) return NextResponse.next()
  const documentPath = pathname === '/blog/index.md' ? '/blog' : directMarkdown ? pathname.slice(0, -3) : pathname
  const response = markdown
    ? NextResponse.rewrite(new URL(pathname === '/' ? '/index.md' : `/markdown${documentPath}`, request.url))
    : NextResponse.next()
  // Proxy runs before the CDN cache, so HTML can stay prerendered. Next keeps this Vary on Markdown responses only.
  response.headers.set('Vary', 'Accept')
  return response
}

export const config = {
  // Next strips Flight headers inside Proxy, so exclude RSC at the matcher.
  matcher: [
    { source: '/', missing: [{ type: 'header', key: 'rsc' }] },
    { source: '/blog/:path*', missing: [{ type: 'header', key: 'rsc' }] },
  ],
}
