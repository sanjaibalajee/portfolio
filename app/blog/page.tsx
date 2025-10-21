import { Footer } from "@/components/footer"
import blogposts from "@/app/blog/blogposts.json"

interface BlogPost {
  slug: string
  date: string
  title: string
}

export default function Blog() {
  const posts: BlogPost[] = blogposts.posts

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <h1 className="font-semibold text-3xl mb-8 tracking-tight text-neutral-900 dark:text-neutral-100">
            blog
          </h1>
          {posts.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">no blogs yet</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <a
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block group hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg p-4 -mx-4 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                    <h2 className="font-medium text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {post.date}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  )
}
