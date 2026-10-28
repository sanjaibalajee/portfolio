import { Footer } from "@/components/footer"
import { AgentViewSwitch } from '@/components/agent-view'
import { getBlogPosts } from '@/lib/blog'
import { ArticleFooter } from '@/components/article-footer'
import { PostLikeProvider } from '@/components/post-like'

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const posts = await getBlogPosts()
  return (
    <AgentViewSwitch>
    <PostLikeProvider slugs={posts.map(post => post.slug)}>
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:mb-2">
          {children}
        </article>
        <ArticleFooter posts={posts} />
      </div>
      <Footer />
    </div>
    </PostLikeProvider>
    </AgentViewSwitch>
  )
}
