import { Footer } from "@/components/footer"
import { AgentViewSwitch } from '@/components/agent-view'
import type { Metadata } from 'next'
import { getBlogPosts } from '@/lib/blog'
import { PostList } from '@/components/post-list'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = {
  ...pageMetadata('/blog', 'blog', 'notes on building, sidequests and the things i learn along the way.'),
  alternates: { canonical: '/blog', types: { 'text/markdown': '/blog/index.md', 'application/rss+xml': '/feed.xml' } },
}

export default async function Blog() {
  const posts = await getBlogPosts()

  return (
    <AgentViewSwitch>
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <h1 className="font-semibold text-3xl mb-8 tracking-tight text-neutral-900 dark:text-neutral-100">
            blog
          </h1>
          <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">notes from building and everything around it. <a href="/feed.xml" className="underline underline-offset-4">follow via rss ↗</a></p>
          {posts.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">no blogs yet</p>
          ) : (
            <PostList posts={posts} />
          )}
        </section>
      </div>
      <Footer />
    </div>
    </AgentViewSwitch>
  )
}
