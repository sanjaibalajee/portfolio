import Link from 'next/link'

type Post = { slug: string; title: string; date: string; description: string; readingMinutes: number }

export function PostList({ posts, headingLevel = 2 }: { posts: Post[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
    {posts.map(post => <Link key={post.slug} href={`/blog/${post.slug}`} className="group block py-5 first:pt-0 last:pb-0">
      <Heading className="text-base font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">{post.title}</Heading>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{post.description}</p>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{post.date} · ~{post.readingMinutes} min read</p>
    </Link>)}
  </div>
}
