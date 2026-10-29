import * as site from '@/lib/site'
import { llmsTxt } from '@/lib/portfolio-markdown'
import blogposts from '@/app/blog/blogposts.json'

export const dynamic = 'force-static'

export function GET() {
  return new Response(llmsTxt(site, blogposts.posts), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
