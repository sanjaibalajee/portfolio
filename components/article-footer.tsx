'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { PostList } from '@/components/post-list'
import { PostLike } from '@/components/post-like'

type Post = { slug: string; title: string; date: string; description: string; readingMinutes: number; related: string[] }

export function ArticleFooter({ posts }: { posts: Post[] }) {
  const pathname = usePathname()
  const post = posts.find(post => pathname === `/blog/${post.slug}`)
  if (!post) return null
  const related = post.related.flatMap(slug => posts.filter(item => item.slug === slug))
  return <div className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
    <PostLike />
    <section className="mt-10" aria-labelledby="read-next">
      <h2 id="read-next" className="mb-6 text-lg font-medium">read next</h2>
      <PostList posts={related} headingLevel={3} />
    </section>
    <p className="mt-8 text-xs text-neutral-600 dark:text-neutral-400">
      <a href="/feed.xml" className="inline-block py-2 underline underline-offset-4">follow via rss</a>
      <span aria-hidden="true"> · </span>
      <Link href="/guestbook" className="inline-block py-2 underline underline-offset-4">leave a note in the guestbook →</Link>
    </p>
  </div>
}
