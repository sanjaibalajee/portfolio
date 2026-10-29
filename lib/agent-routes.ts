import blogposts from '@/app/blog/blogposts.json'

export function supportsAgentView(pathname: string) {
  return pathname === '/' || pathname === '/blog' ||
    blogposts.posts.some(post => pathname === `/blog/${post.slug}`)
}

export function agentMarkdownPath(pathname: string) {
  if (pathname === '/') return '/index.md'
  if (pathname === '/blog') return '/blog/index.md'
  return `${pathname}.md`
}
